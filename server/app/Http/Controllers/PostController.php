<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Post;
use App\Models\Notification;
use App\Models\User;
use App\Models\CloudinaryFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Services\CloudinaryService;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Cache; // <--- Thêm dòng này
use Exception;

class PostController extends Controller
{
    protected $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    /**
     * =========================================================================
     * [NEW] API Lấy thống kê cho Home Page (Posts, Landlords, Views)
     * Route: GET /api/home/stats
     * =========================================================================
     */
  public function getHomeStats()
    {
        try {
            // 1. Tăng lượt truy cập Web (lưu vào Cache vĩnh viễn)
            Cache::increment('site_total_visits');

            // 2. Lấy số liệu Posts và Landlords (Cache 5 phút để nhẹ server)
            $cachedStats = Cache::remember('home_db_stats', 300, function () {
                return [
                    'posts' => Post::where('status', 'published')->count(),
                    'landlords' => User::where('role', 'lessor')->count(),
                ];
            });

            // 3. Lấy số view hiện tại
            $currentWebViews = Cache::get('site_total_visits', 0);

            return response()->json([
                'status' => true,
                'data' => [
                    'posts' => $cachedStats['posts'],
                    'landlords' => $cachedStats['landlords'],
                    'views' => $currentWebViews // Trả về lượt truy cập web thực tế
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Lỗi thống kê Home: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'data' => ['posts' => 0, 'landlords' => 0, 'views' => 0]
            ]);
        }
    }

    /**
     * Chuẩn hoá ảnh + tính main_image_url, thumbnail_url cho 1 Post
     */
    protected function preparePostForResponse(Post $post): Post
    {
        // ===== Chuẩn hoá images: thêm full_url và sort theo sort_order =====
        if ($post->relationLoaded('images')) {
            $post->images = $post->images
                ->sortBy('sort_order')
                ->values()
                ->map(function ($img) {
                    $file = $img->file ?? null;

                    $img->full_url = $file
                        ? (
                            $file->url
                            ?? $file->secure_url
                            ?? $file->image_url
                            ?? $file->path
                            ?? null
                        )
                        : null;

                    return $img;
                });
        }

        // ===== Tính thumbnail_url =====
        $thumbUrl = null;
        if ($post->relationLoaded('thumbnail') && $post->thumbnail) {
            $t = $post->thumbnail;
            $thumbUrl =
                $t->url
                ?? $t->secure_url
                ?? $t->image_url
                ?? $t->path
                ?? null;
        }
        $post->thumbnail_url = $thumbUrl;

        // ===== Tính main_image_url: ưu tiên thumbnail, sau đó ảnh đầu tiên =====
        $mainImage = $thumbUrl;

        if (!$mainImage && $post->relationLoaded('images') && $post->images->count()) {
            $first = $post->images->first();

            if (!empty($first->full_url)) {
                $mainImage = $first->full_url;
            } elseif ($first->file) {
                $f = $first->file;
                $mainImage =
                    $f->url
                    ?? $f->secure_url
                    ?? $f->image_url
                    ?? $f->path
                    ?? null;
            }
        }

        $post->main_image_url = $mainImage;

        // ===== Tính sẵn trung bình & số lượng review =====
        if (!isset($post->reviews_avg)) {
            $post->reviews_avg = round($post->reviews()->avg('rating') ?? 0, 1);
        }
        if (!isset($post->reviews_count)) {
            $post->reviews_count = $post->reviews()->count();
        }

        // ===== Compatibility: make snake_case environment_features available for frontend =====
        if ($post->relationLoaded('environmentFeatures') && $post->environmentFeatures) {
            $post->environment_features = $post->environmentFeatures->toArray();
        } else {
            $post->environment_features = $post->environmentFeatures ? $post->environmentFeatures->toArray() : [];
        }

        return $post;
    }


    // =========================
    // GET api/posts  (danh sách)
    // =========================
    public function index(Request $request)
    {
        try {
            // SỬA LỖI UNAUTHENTICATED Ở ĐÂY:
            // Lấy user từ guard sanctum (nếu có token), nếu không có trả về null thay vì lỗi
            $user = Auth::guard('sanctum')->user();

            $query = Post::with([
                'user',
                'category:id,name',
                'province:id,name',
                'district:id,name',
                'ward:id,name',
                'thumbnail',
                'images.file',
            ])
                ->withCount('reviews')
                ->withAvg('reviews as reviews_avg', 'rating');

            // 🔐 PHÂN QUYỀN
            if ($user) {
                // Nếu đã đăng nhập
                if ($user->role === 'lessor') {
                    // Lessor: Chỉ thấy bài của mình
                    $query->where('user_id', $user->id);
                } elseif ($user->role === 'admin') {
                    // Admin: Thấy tất cả (không filter thêm)
                } else {
                    // User thường: Chỉ thấy bài đã public (giống khách)
                    $query->where('status', 'published');
                }
            } else {
                // Nếu là Khách (chưa đăng nhập): Chỉ thấy bài đã public
                $query->where('status', 'published');
            }

            // ===== FILTER =====
            if ($request->filled('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('province_id')) {
                $query->where('province_id', $request->province_id);
            }

            if ($request->filled('q')) {
                $search = $request->q;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%")
                        ->orWhere('id', $search);
                });
            }

            $posts = $query->orderBy('created_at', 'desc')->paginate(15);

            // Giữ nguyên logic transform của bạn
            $posts->getCollection()->transform(
                fn($post) =>
                $this->preparePostForResponse($post)
            );

            return response()->json([
                'status' => true,
                'data' => $posts->items(),
                'meta' => [
                    'current_page' => $posts->currentPage(),
                    'last_page' => $posts->lastPage(),
                    'total' => $posts->total(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Post index error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => false,
                'message' => 'Không thể tải danh sách bài viết',
            ], 500);
        }
    }

    // =========================
    // GET api/posts/{id}  (chi tiết)
    // =========================
    public function show($id)
    {
        try {
            $post = Post::with([
                'user',
                'category:id,name',
                'province:id,name',
                'district:id,name',
                'ward:id,name',
                'thumbnail',
                'images.file',
                'amenities:id,name',
                'environmentFeatures:id,name',
                'reviews.user',
            ])
                ->withCount('reviews')
                ->withAvg('reviews as reviews_avg', 'rating')
                ->findOrFail($id);

            $post = $this->preparePostForResponse($post);

            return response()->json([
                'status' => true,
                'data' => $post,
            ]);
        } catch (Exception $e) {
            Log::error('Lỗi xem bài viết: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy bài viết hoặc lỗi hệ thống.',
            ], 404);
        }
    }

    // =========================
    // POST api/posts  (tạo mới)
    // =========================
    public function store(Request $request)
    {
        try {
            $user = Auth::user(); // Route này bắt buộc phải có Auth middleware

            if (!$user || !in_array($user->role, ['lessor', 'admin'])) {
                return response()->json([
                    'status' => false,
                    'message' => 'Bạn không có quyền đăng bài.',
                ], 403);
            }

            $request->validate([
                'category_id' => 'required|exists:categories,id',
                'title' => 'required|string|max:255',
                'price' => 'required|integer|min:0',
                'area' => 'required|integer|min:1',
                'address' => 'required|string|max:255',
                'content' => 'nullable|string',
                'contact_phone' => 'nullable|string|max:20',
                'max_people' => 'nullable|integer|min:1',
                'province_id' => 'nullable|exists:provinces,id',
                'district_id' => 'nullable|exists:districts,id',
                'ward_id' => 'nullable|exists:wards,id',
                'status' => 'nullable|in:draft,pending,published,rejected',
                // Relation fields - accept both conventions (amenity_ids OR amenities etc.)
                'amenity_ids' => 'nullable|array',
                'amenity_ids.*' => 'exists:amenities,id',
                'amenities' => 'nullable|array',
                'amenities.*' => 'exists:amenities,id',
                'environment_ids' => 'nullable|array',
                'environment_ids.*' => 'exists:environment_features,id',
                'environment_features' => 'nullable|array',
                'environment_features.*' => 'exists:environment_features,id',
            ]);

            $post = Post::create([
                'user_id' => $user->id,
                'category_id' => $request->category_id,
                'title' => $request->title,
                'price' => $request->price,
                'area' => $request->area,
                'address' => $request->address,
                'content' => $request->input('content'),
                'contact_phone' => $request->contact_phone,
                'max_people' => $request->max_people,
                'province_id' => $request->province_id,
                'district_id' => $request->district_id,
                'ward_id' => $request->ward_id,
                'status' => $request->input('status', 'draft'),
                'published_at' => now(),
            ]);

            if ($user->role === 'lessor' && $post->status === 'published') {
                // Thông báo chỉ khi bài ở trạng thái 'published'
                $post->load('category');
                $category = $post->category ? $post->category->name : 'bài viết';
                $message = "{$user->name} vừa đăng {$category}: {$post->title}";
                foreach (User::admins()->get() as $admin) {
                    Notification::create([
                        'user_id' => $admin->id,
                        'type' => 'post_created',
                        'content' => $message,
                        'is_read' => false,
                        'data' => ['post_id' => $post->id, 'category' => $category],
                    ]);
                }
            }

            // Gắn relations nếu được truyền từ client (hỗ trợ cả 'amenity_ids' hoặc 'amenities',
            // và 'environment_ids' hoặc 'environment_features')
            $amenityInput = null;
            if ($request->filled('amenity_ids')) $amenityInput = $request->input('amenity_ids');
            elseif ($request->filled('amenities')) $amenityInput = $request->input('amenities');

            if (is_array($amenityInput)) {
                // đảm bảo là số nguyên
                $post->amenities()->sync(array_map('intval', $amenityInput));
            }

            $envInput = null;
            if ($request->filled('environment_ids')) $envInput = $request->input('environment_ids');
            elseif ($request->filled('environment_features')) $envInput = $request->input('environment_features');

            if (is_array($envInput)) {
                $post->environmentFeatures()->sync(array_map('intval', $envInput));
            }

            // Tải lại quan hệ để trả về dữ liệu đầy đủ
            $post->load([
                'user:id,name,email',
                'category:id,name',
                'province:id,name',
                'district:id,name',
                'ward:id,name',
                'thumbnail',
                'images.file',
                'amenities:id,name',
                'environmentFeatures:id,name',
            ]);

            // Chuẩn hoá response cho bài vừa tạo
            $post = $this->preparePostForResponse($post);

            return response()->json([
                'status' => true,
                'message' => 'Thêm bài thành công.',
                'data' => $post,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => false,
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            Log::error('Lỗi thêm bài viết: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Không thể thêm bài viết.',
            ], 500);
        }
    }

    // =====================================
    // POST api/posts/{id}/thumbnail (upload)
    // =====================================
    public function uploadThumbnail(Request $request, $id)
    {
        try {
            $post = Post::find($id);

            if (!$post) {
                return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);
            }

            $user = Auth::user();
            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json(['status' => false, 'message' => 'Không có quyền đổi thumbnail.'], 403);
            }

            $request->validate([
                'thumbnail' => 'required|image|mimes:jpeg,png,jpg|max:4096',
            ]);

            if ($post->thumbnail) {
                $this->cloudinary->delete($post->thumbnail->public_id);
                $post->thumbnail->delete();
            }

            $upload = $this->cloudinary->upload(
                $request->file('thumbnail')->getRealPath(),
                'post_thumbnails'
            );

            CloudinaryFile::create([
                'model_type' => Post::class,
                'model_id' => $post->id,
                'public_id' => $upload['public_id'],
                'url' => $upload['secure_url'],
                'type' => 'thumbnail',
            ]);

            return response()->json([
                'status' => true,
                'message' => 'Cập nhật thumbnail thành công.',
                'thumbnail_url' => $upload['secure_url'],
            ]);
        } catch (Exception $e) {
            Log::error("Lỗi cập nhật thumbnail: " . $e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể cập nhật thumbnail.'], 500);
        }
    }

    // =========================
    // PUT api/posts/{id}
    // =========================
    public function update(Request $request, $id)
    {
        try {
            $post = Post::with('images.file')->find($id);

            if (!$post) {
                return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);
            }

            $user = Auth::user();
            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json(['status' => false, 'message' => 'Không có quyền sửa bài.'], 403);
            }

            $request->validate([
                'category_id'         => 'required|exists:categories,id',
                'title'               => 'required|string|max:255',
                'price'               => 'nullable|integer|min:0',
                'area'                => 'nullable|integer|min:1',
                'address'             => 'nullable|string|max:255',
                'content'             => 'nullable|string',
                'contact_phone'       => 'nullable|string|max:20',
                'status'              => 'required|in:draft,pending,published,rejected',
                'max_people'          => 'nullable|integer|min:1',
                'province_id'         => 'nullable|exists:provinces,id',
                'district_id'         => 'nullable|exists:districts,id',
                'ward_id'             => 'nullable|exists:wards,id',

                // Relations (chấp nhận cả tên amenities hoặc amenity_ids; environment_features hoặc environment_ids)
                'amenity_ids'         => 'nullable|array',
                'amenity_ids.*'       => 'exists:amenities,id',
                'amenities'           => 'nullable|array',
                'amenities.*'         => 'exists:amenities,id',
                'environment_ids'     => 'nullable|array',
                'environment_ids.*'   => 'exists:environment_features,id',
                'environment_features' => 'nullable|array',
                'environment_features.*' => 'exists:environment_features,id',

                // gallery
                'remove_image_ids'    => 'array',
                'remove_image_ids.*'  => 'integer',
                'images'              => 'array',
                'images.*'            => 'image|max:4096',
            ]);

            // update text
            $post->update($request->only([
                'category_id', 'title', 'price', 'area', 'address', 'content',
                'contact_phone', 'status', 'max_people',


                'province_id', 'district_id', 'ward_id', 'status',

            ]));

            // remove images
            if ($request->filled('remove_image_ids')) {
                $images = $post->images()
                    ->whereIn('id', $request->remove_image_ids)
                    ->get();

                foreach ($images as $img) {
                    if ($img->file) {
                        $this->cloudinary->delete($img->file->public_id);
                        $img->file->delete();
                    }
                    $img->delete();
                }

            }


            // add new images
            if ($request->hasFile('images')) {
                $currentMaxSort = $post->images()->max('sort_order') ?? 0;

                foreach ($request->file('images') as $index => $file) {
                    $upload = $this->cloudinary->upload(
                        $file->getRealPath(),
                        'post_images'
                    );

                    $cloudFile = CloudinaryFile::create([
                        'model_type' => Post::class,
                        'model_id'   => $post->id,
                        'public_id'  => $upload['public_id'],
                        'url'        => $upload['secure_url'],
                        'type'       => 'image',
                    ]);

                    $post->images()->create([
                        'file_id'    => $cloudFile->id,
                        'sort_order' => $currentMaxSort + $index + 1,
                    ]);
                }
            }

            // Sync relations if provided (accept both conventions)
            $amenityInput = null;
            if ($request->has('amenity_ids')) $amenityInput = $request->input('amenity_ids');
            elseif ($request->has('amenities')) $amenityInput = $request->input('amenities');

            if (is_array($amenityInput)) {
                $post->amenities()->sync(array_map('intval', $amenityInput));
            }

            $envInput = null;
            if ($request->has('environment_ids')) $envInput = $request->input('environment_ids');
            elseif ($request->has('environment_features')) $envInput = $request->input('environment_features');

            if (is_array($envInput)) {
                $post->environmentFeatures()->sync(array_map('intval', $envInput));
            }

            // reload
            $post->load([
                'category:id,name',
                'province:id,name',
                'district:id,name',
                'ward:id,name',
                'thumbnail',
                'images.file',
                'amenities:id,name',
                'environmentFeatures:id,name',
            ]);

            return response()->json([
                'status'  => true,
                'message' => 'Cập nhật bài thành công.',
                'data'    => $this->preparePostForResponse($post),
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => false,
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            Log::error('Post update error: ' . $e->getMessage());
            return response()->json([
                'status'  => false,
                'message' => 'Không thể cập nhật bài viết.',
            ], 500);
        }
    }



    // =========================
    // DELETE api/posts/{id}
    // =========================
    public function destroy($id)
    {
        try {
            $post = Post::with(['images.file', 'thumbnail'])->find($id);

            if (!$post) {
                return response()->json([
                    'status' => false,
                    'message' => 'Không tìm thấy bài viết.'
                ], 404);
            }

            $user = Auth::user();

            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json([
                    'status' => false,
                    'message' => 'Bạn không có quyền xóa bài viết.'
                ], 403);
            }

            // Xóa thumbnail
            if ($post->thumbnail) {
                try {
                    $this->cloudinary->delete($post->thumbnail->public_id);
                } catch (\Throwable $ex) {
                    Log::warning("Không thể xóa thumbnail Cloudinary: " . $ex->getMessage());
                }

                $post->thumbnail->delete();
            }

            // Xóa ảnh post
            foreach ($post->images as $img) {
                if ($img->file) {
                    try {
                        $this->cloudinary->delete($img->file->public_id);
                    } catch (\Throwable $ex) {
                        Log::warning("Không thể xóa ảnh Cloudinary: " . $ex->getMessage());
                    }

                    $img->file->delete();
                }

                $img->delete();
            }

            // Xóa bài viết
            $post->delete();

            return response()->json([
                'status' => true,
                'message' => 'Xóa bài viết thành công.'
            ]);

        } catch (Exception $e) {

            Log::error("Lỗi xóa bài: " . $e->getMessage());

            return response()->json([
                'status' => false,
                'message' => 'Không thể xóa bài viết.'
            ], 500);
        }
    }

    // =========================
    // PUT api/posts/{id}/status  (ADMIN DUYỆT / ẨN)
    // =========================
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();

        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'status' => false,
                'message' => 'Chỉ admin mới được duyệt bài'
            ], 403);
        }

        $request->validate([
            'status' => 'required|in:published,hidden,rejected'
        ]);

        $post = Post::find($id);

        if (!$post) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy bài viết'
            ], 404);
        }

        $oldStatus = $post->status;

        $post->update([
            'status' => $request->status
        ]);

        // Nếu admin chuyển bài sang 'published' từ trạng thái khác -> thông báo cho chủ bài
        if ($request->status === 'published' && $oldStatus !== 'published') {
            $post->load('category');
            $category = $post->category ? $post->category->name : 'bài viết';
            Notification::create([
                'user_id' => $post->user_id,
                'type' => 'post_published',
                'content' => "Bài {$category} của bạn đã được đăng: {$post->title}",
                'is_read' => false,
                'data' => ['post_id' => $post->id, 'category' => $category],
            ]);
        }

        return response()->json([
            'status' => true,
            'message' => 'Đổi trạng thái thành công',
            'data' => $post
        ]);
    }
}