<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Review;
use App\Models\Post;

class ReviewController extends Controller
{
    // GET /api/posts/{post_id}/reviews?stars=5 (xem tất cả review của posts hoặc lọc theo sao)
    public function index(Request $request, $post_id)
    {
        $post = Post::find($post_id);
        if (!$post) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy bài viết.'
            ], 404);
        }

        // Lọc theo số sao nếu có
        $stars = $request->query('stars');

        $query = Review::with('user:id,name')->where('post_id', $post_id);

        if ($stars) {
            $query->where('rating', intval($stars));
        }

        $reviews = $query->orderBy('created_at', 'desc')->get();

        // Tính rating trung bình
        $avgRating = Review::where('post_id', $post_id)->avg('rating') ?? 0;

        // Đếm số review từng sao 1–5
        $ratingsCount = Review::where('post_id', $post_id)
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating');

        $ratingsCountArr = [];
        for ($i = 1; $i <= 5; $i++) {
            $ratingsCountArr[$i] = $ratingsCount[$i] ?? 0;
        }

        return response()->json([
            'status' => true,
            'post_id' => $post_id,
            'average_rating' => round($avgRating, 1),
            'ratings_count' => $ratingsCountArr,
            'total_reviews' => $reviews->count(),
            'filtered_by_stars' => $stars ? intval($stars) : null,
            'data' => $reviews
        ]);
    }

    // POST /api/posts/{post_id}/reviews
    public function store(Request $request, $post_id)
    {
        $post = Post::find($post_id);
        if (!$post) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);
        }

        $user = Auth::user();

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'content' => 'required|string|min:5|max:1000',
        ]);

        // Một người chỉ review 1 lần
        if (Review::where('post_id', $post_id)->where('user_id', $user->id)->exists()) {
            return response()->json([
                'status' => false,
                'message' => 'Bạn đã đánh giá bài viết này rồi.'
            ], 409);
        }

        $review = Review::create([
            'user_id'  => $user->id,
            'post_id'  => $post_id,
            'rating'   => $request->rating,
            'content'  => $request->content
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Thêm đánh giá thành công.',
            'data' => $review
        ], 201);
    }

    // PUT /api/reviews/{id}
    public function update(Request $request, $id)
    {
        $review = Review::find($id);
        if (!$review) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy đánh giá.'], 404);
        }

        $user = Auth::user();

        // Chỉ cho sửa review của chính mình
        if ($review->user_id !== $user->id) {
            return response()->json(['status' => false, 'message' => 'Không có quyền sửa đánh giá này.'], 403);
        }

        $request->validate([
            'rating' => 'nullable|integer|min:1|max:5',
            'content' => 'nullable|string|min:5|max:1000',
        ]);

        $review->update($request->only('rating', 'content'));

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật đánh giá thành công.',
            'data' => $review
        ]);
    }

    // DELETE /api/reviews/{id}
    public function destroy($id)
    {
        $review = Review::find($id);
        if (!$review) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy đánh giá.'], 404);
        }

        $user = Auth::user();

        // Chỉ người viết review và admin mới được xóa
        if ($user->role !== 'admin' && $review->user_id !== $user->id) {
            return response()->json(['status' => false, 'message' => 'Không có quyền xóa đánh giá này.'], 403);
        }

        $review->delete();

        return response()->json([
            'status' => true,
            'message' => 'Xóa đánh giá thành công.'
        ]);
    }
}
