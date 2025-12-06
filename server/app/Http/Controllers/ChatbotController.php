<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotController extends Controller
{
    protected $apiKey;
    protected $geminiUrl;

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
        $this->geminiUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={$this->apiKey}";
    }

    // GET api/chatbot (xử lý nhận tin & trả lời)
    public function sendMessage(Request $request)
    {
        $userMessage = mb_substr($request->input('message'), 0, 500);

        try {
            // * Gửi tin nhắn cho AI để phân loại và trích xuất dữ liệu
            $analysis = $this->classifyIntent($userMessage);
            $intent = $analysis['intent'] ?? 'CHAT';
            
            $posts = [];
            $reply = "";

            switch ($intent) {
                case 'SEARCH':
                    // Lấy các tiêu chí tìm kiếm từ kết quả phân tích
                    $criteria = $analysis['criteria'] ?? [];
                    
                    // Thực hiện tìm kiếm sâu vào Database (Deep Search)
                    $posts = $this->queryDeepSearch($criteria);
                    
                    // Gửi kết quả tìm được lại cho AI để viết câu trả lời
                    $reply = $this->generateSearchResponse($userMessage, $posts);
                    break;

                case 'SUPPORT':
                    $reply = $this->generateSupportResponse($userMessage);
                    break;

                default:
                    $reply = $this->generateChatResponse($userMessage);
                    break;
            }

            return response()->json([
                'intent' => $intent,
                'reply' => $reply,
                'posts' => $posts // Trả về danh sách bài đăng cho giao diện
            ]);

        } catch (\Exception $e) {
            Log::error("Chatbot Error: " . $e->getMessage());
            return response()->json([
                'reply' => "Xin lỗi, hệ thống đang gặp chút sự cố. Bạn vui lòng thử lại sau nhé!", 
                'posts' => []
            ]);
        }
    }

    // =====================================
    //  PHÂN TÍCH VÀ TÌM KIẾM TỪ NGƯỜI DÙNG
    // =====================================
    
    /**
    * B 1: Dùng AI để phân loại câu hỏi của người dùng
    **/
    private function classifyIntent($message)
    {
        $prompt = "
        Bạn là AI hỗ trợ tìm trọ. Hãy phân tích câu: \"$message\" và trả về JSON thuần (không markdown):
        {
            'intent': 'SEARCH' | 'SUPPORT' | 'CHAT',
            'criteria': {
                'location': string | null,  // Vd: 'Bến Cát', 'Huế', 'Phú Mỹ'
                'category_keyword': string | null, // Vd: 'chung cư', 'trọ', 'nhà nguyên căn'
                'min_price': number | null, 
                'max_price': number | null, // Nếu khách nói 'giá rẻ', để max_price = 3000000
                'amenities': string[],      // Vd: ['máy lạnh', 'wifi', 'gác']
                'environment': string[]     // Vd: ['an ninh', 'yên tĩnh', 'gần chợ']
            }
        }
        Lưu ý:
        - 'SUPPORT': Các câu hỏi về cách dùng web, liên hệ admin, lỗi web, Hỗ trợ.
        - 'SEARCH': Các câu hỏi tìm phòng, hỏi giá, địa điểm.
        - 'CHAT': Không liên quan đến tìm trọ hay web.
        ";

        $response = $this->callGemini($prompt);
        // Xử lý chuỗi JSON nếu AI lỡ bọc trong markdown code block
        $jsonStr = trim(str_replace(['```json', '```', 'php'], '', $response));
        $data = json_decode($jsonStr, true);

        if (!is_array($data)) {
            return ['intent' => 'CHAT', 'criteria' => []];
        }

        return $data;
    }

    /**
     * (LUỒNG 1) B 2.1: Truy vấn trong database dựa trên tiêu chí do AI phân tích:
    **/
    private function queryDeepSearch($criteria)
    {
        // Load các quan hệ được định nghĩa trong Model Post
        $query = Post::where('status', 'published') // Chỉ lấy bài đã public
            ->with(['images', 'category', 'district', 'province', 'ward', 'amenities', 'environmentFeatures']); 

        // 1. Tìm theo Địa điểm (Location)
        if (!empty($criteria['location'])) {
            $loc = $criteria['location'];
            $query->where(function($q) use ($loc) {
                $q->where('address', 'like', "%$loc%") // Tìm trong cột address
                  ->orWhere('title', 'like', "%$loc%") // Tìm trong title
                  ->orWhereHas('district', fn($d) => $d->where('name', 'like', "%$loc%")) // Tìm trong quan hệ district
                  ->orWhereHas('province', fn($p) => $p->where('name', 'like', "%$loc%")) // Tìm trong quan hệ province
                  ->orWhereHas('ward', fn($w) => $w->where('name', 'like', "%$loc%"));    // Tìm trong quan hệ ward
            });
        }

        // 2. Tìm theo Loại phòng (Category)
        if (!empty($criteria['category_keyword'])) {
            $catKw = $criteria['category_keyword'];
            $query->whereHas('category', function($q) use ($catKw) { // Dùng quan hệ category
                $q->where('name', 'like', "%$catKw%");
            });
        }

        // 3. Tìm theo Giá (Price)
        if (!empty($criteria['min_price'])) {
            $query->where('price', '>=', $criteria['min_price']); // Cột price
        }
        if (!empty($criteria['max_price'])) {
            $query->where('price', '<=', $criteria['max_price']);
        }

        // 4. Tìm theo Tiện ích (Amenities)
        if (!empty($criteria['amenities']) && is_array($criteria['amenities'])) {
            foreach ($criteria['amenities'] as $amenityName) {
                // Dùng quan hệ amenities() trong Model Post
                $query->whereHas('amenities', function($q) use ($amenityName) {
                    $q->where('name', 'like', "%$amenityName%");
                });
            }
        }

        // 5. Tìm theo Môi trường (EnvironmentFeatures)
        if (!empty($criteria['environment']) && is_array($criteria['environment'])) {
            foreach ($criteria['environment'] as $envName) {
                // Dùng quan hệ environmentFeatures() trong Model Post
                $query->whereHas('environmentFeatures', function($q) use ($envName) {
                    $q->where('name', 'like', "%$envName%");
                });
            }
        }

        // Lấy 3 kết quả tốt nhất
        return $query->limit(3)->get();
    }

    /**
     * (LUỒNG 1) B 2.2: Tạo câu trả lời tự nhiên phù hợp yêu cầu tìm kiếm:
     */
    private function generateSearchResponse($userMessage, $posts)
    {
        if ($posts->isEmpty()) {
            return $this->callGemini("Người dùng hỏi: '$userMessage'. Không tìm thấy phòng nào. Hãy xin lỗi và gợi ý họ tìm khu vực khác hoặc thay đổi mức giá.");
        }

        // Tạo Context chi tiết từ dữ liệu DB để AI đọc
        $postsData = $posts->map(function($p) {
            return [
                'id' => $p->id,
                'title' => $p->title,
                'price' => $p->price,
                'address' => $p->address,
                'district' => $p->district->name ?? '',
                'province' => $p->province->name ?? '',
                'amenities' => $p->amenities->pluck('name')->toArray(),
                'environment' => $p->environmentFeatures->pluck('name')->toArray(),
            ];
        })->toArray();

        $prompt = "
        Bạn là trợ lý tìm trọ thông minh.
        Câu hỏi khách: \"$userMessage\"
        
        Dữ liệu tìm thấy (JSON):
        " . json_encode($postsData, JSON_UNESCAPED_UNICODE) . "
        
        Yêu cầu:
        1. Trả lời nhiệt tình, xác nhận đã tìm thấy (ví dụ: 'Mình tìm thấy vài chỗ ở [Địa điểm] có [Tiện ích] đúng ý bạn').
        2. Tóm tắt nhanh điểm nổi bật của 1-2 phòng đầu tiên.
        3. Mời khách bấm vào thẻ bên dưới xem chi tiết.
        ";

        return $this->callGemini($prompt);
    }

    /**
     * (LUỒNG 2) B 2: Trả lời về Website (Dữ liệu tĩnh, FAQ):
     */
    private function generateSupportResponse($userMessage)
    {
        $websiteInfo = "
        - Tên website: Quản lý cho thuê trọ.
        - Chức năng: Kết nối người muốn tìm trọ, Nhà nguyên căn, căn hộ, ký trúc xá .
        - Cách đăng bài cho thuê: Đăng ký tài khoản -> Chọn 'Đăng ký làm người cho thuê' -> Gửi thông tin -> Chờ duyệt -> Và có thể đăng bài.
        - Liên hệ Admin: Email Timtro@gmail.com hoặc SĐT 0987654321.
        - Phí dịch vụ: Hoàn toàn miễn phí, hỗ trợ mọi người tìm kiếm trọ.
        - Xem review: trong mọi bài viết của người cho thuê điều có mục đánh giá từ người thuê.
        - Cách đăng Blog: Các bài blog chỉ có admin đăng tải.
        - Cách thuê trọ: Liên hệ người cho thuê qua số điện thoại trực tiếp hoặc qua zalo có trong mỗi bài đăng.
        - Chatbot hỗ trợ: Tư vấn tìm trọ, giải đáp thắc mắc về website và dịch vụ cho người dùng.
        - Cách Lưu bài viết: Người dùng có thể lưu bài viết yêu thích để xem sau bằng cách nhấn vào biểu tượng trái tim ở bài viết.
        - Cách đăng ký tài khoản: Nhấn vào nút 'Đăng ký' ở góc phải trên cùng, điền thông tin để đăng ký.
        - Quên mật khẩu: Nhấn vào 'Quên mật khẩu' trên trang đăng nhập, làm theo hướng dẫn để đặt lại mật khẩu.
        - Hợp đồng: Chỉ hỗ trợ tìm kiếm, không tham gia vào hợp đồng thuê giữa các bên.
        - Thay đổi thông tin cá nhân: Vào mục 'Cài đặt tài khoản' để cập nhật thông tin.
        ";

        $prompt = "
        Bạn là nhân viên hỗ trợ kỹ thuật của website.
        Thông tin hệ thống:
        $websiteInfo
        
        Câu hỏi khách hàng: \"$userMessage\"
        
        Yêu cầu: Dựa vào thông tin trên để trả lời khách hàng một cách chuyên nghiệp, ngắn gọn.
        ";
        return $this->callGemini($prompt);
    }

    /**
     * (LUỒNG 3) B 2: Trả lời trò chuyện thông thường:
     */
    private function generateChatResponse($userMessage)
    {
        $prompt = "
        Bạn là một trợ lý ảo vui tính trên website tìm trọ.
        Người dùng nói: \"$userMessage\"
        
        Yêu cầu: Trả lời ngắn gọn, thân thiện (dưới 50 từ). Nếu câu hỏi quá xa lạ (như giải toán, code) hoặc không liên quan đến tìm kiếm trọ hay website,
        hãy khéo léo từ chối và nhắc họ quay lại chủ đề tìm trọ.
        ";
        return $this->callGemini($prompt);
    }


    /**
     *Gọi API AI để nhận phản hồi
    **/
    private function callGemini($prompt)
    {
        $response = Http::post($this->geminiUrl, [
            'contents' => [['role' => 'user' , 'parts' => [['text' => $prompt]]]]
        ]);

        if (!$response->successful()) {
            Log::error("Gemini API Error: " . $response->body());
            return "Hiện AI đang quá tải, bạn thử lại sau nhé!";
        }

        $json = $response->json();

        return $json['candidates'][0]['content']['parts'][0]['text'] ?? '';
    }
}