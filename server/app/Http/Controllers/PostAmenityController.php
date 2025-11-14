<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Post;

class PostAmenityController extends Controller
{
    // GET /api/posts/{id}/amenities
    public function index($id)
    {
        $post = Post::with('amenities')->find($id);
        if (!$post)
            return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);

        return response()->json(['status' => true, 'data' => $post->amenities]);
    }

    // POST /api/posts/{id}/amenities (admin & lessor)
    public function attach(Request $request, $id)
    {
        $post = Post::find($id);
        if (!$post)
            return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);

        $user = Auth::user();
        if ($user->role !== 'admin' && $user->id !== $post->user_id) {
            return response()->json(['status' => false, 'message' => 'Bạn không có quyền gắn tiện ích.'], 403);
        }

        $request->validate([
            'amenity_ids' => 'required|array',
            'amenity_ids.*' => 'exists:amenities,id'
        ]);

        $post->amenities()->syncWithoutDetaching($request->amenity_ids);

        return response()->json(['status' => true, 'message' => 'Gắn tiện ích thành công.']);
    }

    // DELETE /api/posts/{id}/amenities (admin & lessor)
    public function detach(Request $request, $id)
    {
        $post = Post::find($id);
        if (!$post)
            return response()->json(['status' => false, 'message' => 'Không tìm thấy bài viết.'], 404);

        $user = Auth::user();
        if ($user->role !== 'admin' && $user->id !== $post->user_id) {
            return response()->json(['status' => false, 'message' => 'Bạn không có quyền xóa tiện ích.'], 403);
        }

        $request->validate([
            'amenity_ids' => 'required|array',
            'amenity_ids.*' => 'exists:amenities,id'
        ]);

        $post->amenities()->detach($request->amenity_ids);

        return response()->json(['status' => true, 'message' => 'Xóa tiện ích thành công.']);
    }
}
