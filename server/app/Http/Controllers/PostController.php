<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Post;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Exception;

class PostController extends Controller
{
    // GET api/posts (xem tất cả)
    public function index()
    {
        try {
            $posts = Post::with(['user:id,name,role', 'category:id,name', 'images'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'status' => true,
                'data' => $posts
            ], 200);
        } catch (Exception $e) {
            Log::error('Lỗi lấy danh sách bài viết: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Đã xảy ra lỗi khi tải danh sách bài viết.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // GET api/posts/{id} (xem chi tiết)
    public function show($id)
    {
        try {
            $post = Post::with(['user:id,name,role', 'category:id,name', 'images'])->find($id);

            if (!$post) {
                return response()->json([
                    'status' => false,
                    'message' => 'Không tìm thấy bài viết.'
                ], 404);
            }

            return response()->json([
                'status' => true,
                'data' => $post
            ], 200);
        } catch (Exception $e) {
            Log::error('Lỗi xem bài viết: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Đã xảy ra lỗi khi xem bài viết.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // POST api/posts (chỉ lessor hoặc admin, tạo bài)
    public function store(Request $request)
    {
        try {
            $user = Auth::user();

            // *Chỉ lessor hoặc admin được đăng bài
            if (!in_array($user->role, ['lessor', 'admin'])) {
                return response()->json([
                    'status' => false,
                    'message' => 'Chỉ chủ cho thuê hoặc admin mới được thêm bài viết.'
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
            ]);

            $post = Post::create([
                'user_id' => $user->id,
                'category_id' => $request->category_id,
                'title' => $request->title,
                'price' => $request->price,
                'area' => $request->area,
                'address' => $request->address,
                'content' => $request->content,
                'contact_phone' => $request->contact_phone,
                'max_people' => $request->max_people,
                'province_id' => $request->province_id,
                'district_id' => $request->district_id,
                'ward_id' => $request->ward_id,
                'status' => 'published',
                'published_at' => now(),
            ]);

            return response()->json([
                'status' => true,
                'message' => 'Thêm bài viết thành công.',
                'data' => $post
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (Exception $e) {
            Log::error('Lỗi thêm bài viết: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Không thể thêm bài viết.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // PUT api/posts/{id} (chỉ lessor tạo bài hoặc admin, sửa bài)
    public function update(Request $request, $id)
    {
        try {
            $post = Post::find($id);
            if (!$post) {
                return response()->json([
                    'status' => false,
                    'message' => 'Không tìm thấy bài viết.'
                ], 404);
            }

            $user = Auth::user();

            // *Chỉ admin hoặc lessor là người tạo bài mới được sửa
            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json([
                    'status' => false,
                    'message' => 'Bạn không có quyền sửa bài viết này.'
                ], 403);
            }

            $request->validate([
                'category_id' => 'nullable|exists:categories,id',
                'title' => 'nullable|string|max:255',
                'price' => 'nullable|integer|min:0',
                'area' => 'nullable|integer|min:1',
                'address' => 'nullable|string|max:255',
                'content' => 'nullable|string',
                'contact_phone' => 'nullable|string|max:20',
                'status' => 'nullable|in:draft,published,hidden',
                'max_people' => 'nullable|integer|min:1',
                'province_id' => 'nullable|exists:provinces,id',
                'district_id' => 'nullable|exists:districts,id',
                'ward_id' => 'nullable|exists:wards,id',
            ]);

            $post->update($request->only([
                'category_id', 'title', 'price', 'area', 'address',
                'content', 'contact_phone', 'status',
                'max_people', 'province_id', 'district_id', 'ward_id'
            ]));

            return response()->json([
                'status' => true,
                'message' => 'Cập nhật bài viết thành công.',
                'data' => $post
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors()
            ], 422);
        } catch (Exception $e) {
            Log::error('Lỗi cập nhật bài viết: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Không thể cập nhật bài viết.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // DELETE api/posts/{id} (chỉ lessor tạo bài hoặc admin, xóa bài)
    public function destroy($id)
    {
        try {
            $post = Post::find($id);
            if (!$post) {
                return response()->json([
                    'status' => false,
                    'message' => 'Không tìm thấy bài viết.'
                ], 404);
            }

            $user = Auth::user();

            // *Chỉ admin hoặc lessor là người tạo bài mới được xóa
            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json([
                    'status' => false,
                    'message' => 'Bạn không có quyền xóa bài viết này.'
                ], 403);
            }

            $post->delete();

            return response()->json([
                'status' => true,
                'message' => 'Xóa bài viết thành công.'
            ], 200);
        } catch (Exception $e) {
            Log::error('Lỗi xóa bài viết: ' . $e->getMessage());
            return response()->json([
                'status' => false,
                'message' => 'Không thể xóa bài viết.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
