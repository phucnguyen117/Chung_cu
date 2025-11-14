<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Post;

class PostEnvironmentController extends Controller
{
    // GET /api/posts/{id}/environment
    public function index($id)
    {
        $post = Post::with('environmentFeatures')->find($id);
        if (!$post)
            return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);

        return response()->json(['status' => true, 'data' => $post->environmentFeatures]);
    }

    // POST /api/posts/{id}/environment (admin & lessor)
    public function attach(Request $request, $id)
    {
        $post = Post::find($id);
        if (!$post)
            return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);

        $user = Auth::user();
        if ($user->role !== 'admin' && $user->id !== $post->user_id) {
            return response()->json(['status' => false, 'message' => 'Không có quyền.'], 403);
        }

        $request->validate([
            'feature_ids' => 'required|array',
            'feature_ids.*' => 'exists:environment_features,id'
        ]);

        $post->environmentFeatures()->syncWithoutDetaching($request->feature_ids);

        return response()->json(['status' => true, 'message' => 'Gắn đặc điểm thành công.']);
    }

    // DELETE /api/posts/{id}/environment (admin & lessor)
    public function detach(Request $request, $id)
    {
        $post = Post::find($id);
        if (!$post)
            return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);

        $user = Auth::user();
        if ($user->role !== 'admin' && $user->id !== $post->user_id) {
            return response()->json(['status' => false, 'message' => 'Không có quyền.'], 403);
        }

        $request->validate([
            'feature_ids' => 'required|array',
            'feature_ids.*' => 'exists:environment_features,id'
        ]);

        $post->environmentFeatures()->detach($request->feature_ids);

        return response()->json(['status' => true, 'message' => 'Xóa đặc điểm thành công.']);
    }
}
