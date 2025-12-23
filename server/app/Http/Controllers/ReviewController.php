<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Review;
use App\Models\Post;
use App\Models\Notification;


class ReviewController extends Controller
{
    /**
     * TRANG TỔNG: Lấy tất cả review của TẤT CẢ post (public)
     * GET /api/reviews?stars=5&page=1&per_page=12
     */
    public function all(Request $request)
    {
    


        $perPage = (int) $request->query('per_page', 12);
        if ($perPage <= 0) {
            $perPage = 12;
        }

        $stars = $request->query('stars');

        // ----- Query danh sách review (kèm user + post) -----
        $reviews = Review::with([
                'user:id,name',
                'post:id,title'
            ])
            ->when(!empty($stars), function ($q) use ($stars) {
                $q->where('rating', (int) $stars);
            })
            // CHỈ LẤY REVIEW KHÔNG BỊ ẨN
            ->where('is_hidden', false)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        // ----- Query base cho summary -----
        $baseQuery = Review::query()
            ->where('is_hidden', false);

        if (!empty($stars)) {
            $baseQuery->where('rating', (int) $stars);
        }

        // trung bình sao
        $avgRating = (clone $baseQuery)->avg('rating') ?? 0;

        // đếm số review từng số sao 1–5
        $ratingsCount = (clone $baseQuery)
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating');

        $ratingsCountArr = [];
        for ($i = 1; $i <= 5; $i++) {
            $ratingsCountArr[$i] = $ratingsCount[$i] ?? 0;
        }

        $totalReviews = (clone $baseQuery)->count();

        return response()->json([
            'status'         => true,
            'average_rating' => round($avgRating, 1),
            'ratings_count'  => $ratingsCountArr,
            'total_reviews'  => $totalReviews,
            'data'           => $reviews->items(),
            'meta'           => [
                'current_page' => $reviews->currentPage(),
                'last_page'    => $reviews->lastPage(),
                'per_page'     => $reviews->PerPage(),
                'total'        => $reviews->total(),
            ],
        ]);
    }

    /**
     * TRANG THEO BÀI: review của 1 post (public)
     * GET /api/posts/{post_id}/reviews?stars=5
     */
    public function index(Request $request, $post_id)
    {
        $post = Post::find($post_id);
        if (!$post) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy bài viết.',
            ], 404);
        }

        $stars = $request->query('stars');

        $query = Review::with('user:id,name')
            ->where('post_id', $post_id)
            // CHỈ LẤY REVIEW KHÔNG BỊ ẨN
            ->where('is_hidden', false);

        if (!empty($stars)) {
            $query->where('rating', (int) $stars);
        }

        $reviews = $query->orderBy('created_at', 'desc')->get();

        $avgRating = Review::where('post_id', $post_id)
            ->where('is_hidden', false)
            ->avg('rating') ?? 0;

        $ratingsCount = Review::where('post_id', $post_id)
            ->where('is_hidden', false)
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating');

        $ratingsCountArr = [];
        for ($i = 1; $i <= 5; $i++) {
            $ratingsCountArr[$i] = $ratingsCount[$i] ?? 0;
        }

        return response()->json([
            'status'            => true,
            'post_id'           => $post_id,
            'average_rating'    => round($avgRating, 1),
            'ratings_count'     => $ratingsCountArr,
            'total_reviews'     => $reviews->count(),
            'filtered_by_stars' => $stars ? (int) $stars : null,
            'data'              => $reviews,
        ]);
    }

    /**
     * TẠO REVIEW CHO 1 BÀI
     * POST /api/posts/{post_id}/reviews
     * body: rating, content, images[]
     */
    public function store(Request $request, $post_id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn phải đăng nhập để đánh giá.',
            ], 401);
        }

        $post = Post::find($post_id);
        if (!$post) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy bài viết.',
            ], 404);
        }

        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'content' => 'required|string',
           
        ]);

        $review = new Review();
        $review->post_id = $post->id;
        $review->user_id = $user->id;
        $review->rating  = $validated['rating'];
        $review->content = $validated['content'];
        $review->is_hidden = false; // mặc định hiển thị
        $review->save();

        // TODO: xử lý lưu ảnh từ $request->file('images') nếu có bảng review_images

        // load lại quan hệ user cho FE
        $review->load('user:id,name');

        return response()->json([
            'status'  => true,
            'message' => 'Đã tạo đánh giá thành công.',
            'data'    => $review,
        ], 201);
        $exists = Review::where('post_id', $post_id)
    ->where('user_id', $user->id)
    ->whereNull('parent_id') // Quan trọng: chỉ check bài gốc
    ->exists();

if ($exists) {
    return response()->json([
        'status' => false,
        'message' => 'Bạn đã đánh giá bài viết này rồi.'
    ], 409);
}
    }

    /**
     * CẬP NHẬT REVIEW (user tự sửa)
     * PUT /api/reviews/{id}
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn phải đăng nhập.',
            ], 401);
        }

        $review = Review::find($id);
        if (!$review) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy đánh giá.',
            ], 404);
        }

        if ($review->user_id !== $user->id) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn không có quyền sửa đánh giá này.',
            ], 403);
        }

        $validated = $request->validate([
            'rating'  => 'sometimes|integer|min:1|max:5',
            'content' => 'sometimes|string',
        ]);

        if (isset($validated['rating'])) {
            $review->rating = $validated['rating'];
        }
        if (isset($validated['content'])) {
            $review->content = $validated['content'];
        }

        $review->save();
        $review->load('user:id,name');

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật đánh giá thành công.',
            'data'    => $review,
        ]);
    }

    /**
     * XOÁ REVIEW (user tự xoá)
     * DELETE /api/reviews/{id}
     */
    public function destroy($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn phải đăng nhập.',
            ], 401);
        }

        $review = Review::find($id);
        if (!$review) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy đánh giá.',
            ], 404);
        }

        if ($review->user_id !== $user->id) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn không có quyền xoá đánh giá này.',
            ], 403);
        }

        $review->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xoá đánh giá.',
        ]);
    }

    /**
     * ADMIN: Lấy tất cả review (có phân trang)
     * GET /api/admin/reviews?per_page=50&hidden=1
     */
    public function adminIndex(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn phải đăng nhập.',
            ], 401);
        }

        // TODO: kiểm tra quyền admin nếu có hệ thống role
        // if (!$user->is_admin) { ... }

        $perPage = (int) $request->query('per_page', 50);
        if ($perPage <= 0) {
            $perPage = 50;
        }

        $query = Review::with([
                'user:id,name,email',
                'post:id,title',
            ])
            ->orderBy('created_at', 'desc');

        // filter ẩn/hiện nếu muốn: /admin/reviews?hidden=1
        if ($request->has('hidden')) {
            $hidden = (int) $request->query('hidden') === 1;
            $query->where('is_hidden', $hidden);
        }

        $reviews = $query->paginate($perPage);

        return response()->json([
            'status' => true,
            'data'   => $reviews->items(),
            'meta'   => [
                'current_page' => $reviews->currentPage(),
                'last_page'    => $reviews->lastPage(),
                'per_page'     => $reviews->perPage(),
                'total'        => $reviews->total(),
            ],
        ]);
    }

    /**
     * ADMIN: Ẩn / hiện review
     * PATCH /api/admin/reviews/{id}/toggle
     */
    public function adminToggleVisibility($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn phải đăng nhập.',
            ], 401);
        }

        // TODO: kiểm tra quyền admin nếu có hệ thống role
        // if (!$user->is_admin) { ... }

        $review = Review::with(['user:id,name', 'post:id,title'])->find($id);
        if (!$review) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy đánh giá.',
            ], 404);
        }

        $review->is_hidden = !$review->is_hidden;
        $review->save();

        return response()->json([
            'status'  => true,
            'message' => $review->is_hidden
                ? 'Đánh giá đã được ẩn.'
                : 'Đánh giá đã được hiển thị.',
            'data'    => $review,
        ]);
    }

    /**
     * ADMIN: Xoá review (bất kể chủ sở hữu)
     * DELETE /api/admin/reviews/{id}
     */
    public function adminDestroy($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn phải đăng nhập.',
            ], 401);
        }

        // TODO: kiểm tra quyền admin nếu có hệ thống role
        // if (!$user->is_admin) { ... }

        $review = Review::find($id);
        if (!$review) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy đánh giá.',
            ], 404);
        }

        $review->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xoá đánh giá.',
        ]);
    }
    /**
     * REPLY VÀO REVIEW GỐC
     * POST /api/reviews/{id}/replies
     */
public function replyReview(Request $request, $reviewId)
{
    $request->validate([
        'content' => 'required|string',
    ]);

    $parent = Review::findOrFail($reviewId);

    $reply = Review::create([
        'post_id'   => $parent->post_id,
        'user_id'   => auth()->id(),
        'parent_id' => $parent->id,
        'content'   => $request->content,
        'rating'    => null,
        'is_hidden' => false,
    ]);

    return response()->json([
        'status' => true,
        'data'   => $reply
    ]);
}



public function updateReply(Request $request, $id)
{
    $reply = Review::findOrFail($id);

    // chỉ chủ reply mới được sửa
    if ($reply->user_id !== auth()->id()) {
        return response()->json([
            'status' => false,
            'message' => 'Bạn không có quyền sửa bình luận này'
        ], 403);
    }

    $request->validate([
        'content' => 'required|string',
    ]);

    $reply->update([
        'content' => $request->content,
    ]);

    return response()->json([
        'status' => true,
        'data' => $reply
    ]);
}

public function deleteReply($id)
{
    $reply = Review::findOrFail($id);

    // chỉ chủ reply mới được xóa
    if ($reply->user_id !== auth()->id()) {
        return response()->json([
            'status' => false,
            'message' => 'Bạn không có quyền xóa bình luận này'
        ], 403);
    }

    $reply->delete();

    return response()->json([
        'status' => true
    ]);
}

    /**
     * TRẢ LỜI VÀO MỘT REPLY CON
     * POST /api/replies/{replyId}/child
     */
   // POST /api/replies/{id}/child
public function replyChild(Request $request, $replyId)
{
    $request->validate([
        'content' => 'required|string',
    ]);

    $parent = Review::findOrFail($replyId);

    $reply = Review::create([
        'post_id'   => $parent->post_id,
        'user_id'   => auth()->id(),
        'parent_id' => $parent->id,
        'content'   => $request->content,
        'rating'    => null,
        'is_hidden' => false,
    ]);

    return response()->json([
        'status' => true,
        'data'   => $reply
    ]);
}



    /**
     * TẢI REVIEW TREE ĐẦY ĐỦ
     * GET /api/posts/{postId}/review-tree
     */
        public function getTree($postId)
        {
            try {
                $reviews = Review::with([
                    'user:id,name,avatar_url',
                    'replies.user:id,name,avatar_url',
                    'replies.children.user:id,name,avatar_url',
                ])
                ->where('post_id', $postId)
                ->whereNull('parent_id')
                ->where('is_hidden', false)
                ->orderBy('created_at', 'desc')
                ->get();

                    return response()->json([
                    'status' => true,
                    'data'   => $reviews
                ]);
            } catch (\Exception $e) {
                Log::error('getTree error: ' . $e->getMessage());

                // Trả về 200 với data rỗng để frontend không nhận HTTP 500 (giữ UX ổn định),
                // nhưng vẫn báo lỗi trong body để dễ debug.
                return response()->json([
                    'status' => false,
                    'message' => 'Không thể tải cây bình luận hiện tại.',
                    'data' => [],
                ], 200);
            }
        }


}
