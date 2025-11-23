<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\BlogPost;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;

class BlogController extends Controller
{
    // GET /api/blogs - Lấy danh sách blog
    public function index()
    {
        try {
            $blogs = BlogPost::orderBy('created_at', 'desc')->get();
            return response()->json(['status' => true, 'data' => $blogs], 200);
        } catch (Exception $e) {
            Log::error('Lỗi lấy danh sách blog: '.$e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể tải danh sách blog.'], 500);
        }
    }

    // GET /api/blogs/{id} - Lấy chi tiết blog
    public function show($id)
    {
        try {
            $blog = BlogPost::find($id);
            if (!$blog) {
                return response()->json(['status' => false, 'message' => 'Không tìm thấy blog.'], 404);
            }
            return response()->json(['status' => true, 'data' => $blog], 200);
        } catch (Exception $e) {
            Log::error('Lỗi lấy chi tiết blog: '.$e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể tải chi tiết blog.'], 500);
        }
    }

    // -------------------------
    //  Helper kiểm tra quyền admin
    // -------------------------
    private function isAdmin()
    {
        return Auth::check() && Auth::user()->role === 'admin';
    }

    // POST /api/blogs - Thêm blog
    public function store(Request $request)
    {
        if (!$this->isAdmin()) {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới thêm blog.'], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'excerpt' => 'nullable|string|max:500',
            'content' => 'required|string',
            'cover' => 'nullable|string|max:255',
            'published_at' => 'nullable|date'
        ]);

        try {
            // Tạo slug
            $slug = Str::slug($request->title);
            
            // Check slug trùng
            if (BlogPost::where('slug', $slug)->exists()) {
                $slug .= '-' . time();
            }

            $blog = BlogPost::create([
                'title' => $request->title,
                'slug' => $slug,
                'excerpt' => $request->excerpt,
                'content' => $request->content,
                'cover' => $request->cover,
                'published_at' => $request->published_at
                    ? Carbon::parse($request->published_at)
                    : now()
            ]);

            return response()->json([
                'status' => true,
                'message' => 'Thêm blog thành công.',
                'data' => $blog
            ], 201);

        } catch (Exception $e) {
            Log::error('Lỗi thêm blog: '.$e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể thêm blog.'], 500);
        }
    }

    // PUT /api/blogs/{id} - Sửa blog
    public function update(Request $request, $id)
    {
        if (!$this->isAdmin()) {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới sửa blog.'], 403);
        }

        $request->validate([
            'title' => 'nullable|string|max:255',
            'excerpt' => 'nullable|string|max:500',
            'content' => 'nullable|string',
            'cover' => 'nullable|string|max:255',
            'published_at' => 'nullable|date'
        ]);

        try {
            $blog = BlogPost::find($id);
            if (!$blog) {
                return response()->json(['status' => false, 'message' => 'Không tìm thấy blog.'], 404);
            }

            $updateData = [];
            
            if ($request->filled('title')) {
                $updateData['title'] = $request->title;
                // Slug mới
                $slug = Str::slug($request->title);
                if (BlogPost::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                    $slug .= '-' . time();
                }
                $updateData['slug'] = $slug;
            }

            if ($request->filled('excerpt')) {
                $updateData['excerpt'] = $request->excerpt;
            }

            if ($request->filled('content')) {
                $updateData['content'] = $request->content;
            }

            if ($request->filled('cover')) {
                $updateData['cover'] = $request->cover;
            }

            if ($request->filled('published_at')) {
                $updateData['published_at'] = Carbon::parse($request->published_at);
            }

            $blog->update($updateData);

            return response()->json([
                'status' => true,
                'message' => 'Cập nhật blog thành công.',
                'data' => $blog
            ], 200);

        } catch (Exception $e) {
            Log::error('Lỗi sửa blog: '.$e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể sửa blog.'], 500);
        }
    }

    // DELETE /api/blogs/{id} - Xóa blog
    public function destroy($id)
    {
        if (!$this->isAdmin()) {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới xóa blog.'], 403);
        }

        try {
            $blog = BlogPost::find($id);
            if (!$blog) {
                return response()->json(['status' => false, 'message' => 'Không tìm thấy blog.'], 404);
            }

            $blog->delete();

            return response()->json([
                'status' => true,
                'message' => 'Xóa blog thành công.'
            ], 200);

        } catch (Exception $e) {
            Log::error('Lỗi xóa blog: '.$e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể xóa blog.'], 500);
        }
    }
}

