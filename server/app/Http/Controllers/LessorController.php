<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Post;
use App\Models\Review;

class LessorController extends Controller
{
    /**
     * API STATS: tổng bài đăng và đánh giá của lessor
     * GET /api/lessor/stats
     */
    public function stats()
    {
        $user = Auth::user();

        if (!in_array($user->role, ['lessor', 'admin'])) {
            return response()->json([
                'status' => false,
                'message' => 'Bạn không có quyền truy cập.',
            ], 403);
        }

        // Đếm bài đăng của lessor
        $totalPosts = Post::where('user_id', $user->id)->count();

        // Đếm đánh giá cho các bài đăng của lessor
        $postIds = Post::where('user_id', $user->id)->pluck('id');
        $totalReviews = Review::whereIn('post_id', $postIds)
            ->where('is_hidden', false)
            ->count();

        return response()->json([
            'status' => true,
            'data' => [
                'total_posts' => $totalPosts,
                'total_reviews' => $totalReviews,
            ],
        ]);
    }

    /**
     * API DANH SÁCH REVIEWS: chỉ reviews của các bài đăng của lessor
     * GET /api/lessor/reviews
     */
    public function reviews(Request $request)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['lessor', 'admin'])) {
            return response()->json([
                'status' => false,
                'message' => 'Bạn không có quyền truy cập.',
            ], 403);
        }

        // Lấy danh sách ID bài đăng của lessor
        $postIds = Post::where('user_id', $user->id)->pluck('id');

        // Query reviews
        $reviews = Review::with([
                'user:id,name,email',
                'post:id,title'
            ])
            ->whereIn('post_id', $postIds)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'status' => true,
            'data' => $reviews,
        ]);
    }
}

