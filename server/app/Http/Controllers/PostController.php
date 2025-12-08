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
use Exception;

class PostController extends Controller
{
    protected $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
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

        // ===== Tính sẵn trung bình & số lượng review (nếu chưa có) =====
        if (!isset($post->reviews_avg)) {
            $post->reviews_avg = round($post->reviews()->avg('rating') ?? 0, 1);
        }
        if (!isset($post->reviews_count)) {
            $post->reviews_count = $post->reviews()->count();
        }

        return $post;
    }

    // =========================
    // GET api/posts  (danh sách)
    // =========================
    public function index(Request $request)
    {
        try {
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

            // Nếu có tham số my_posts=1, chỉ lấy bài đăng của user hiện tại
            if ($request->query('my_posts') == '1' && Auth::check()) {
                $query->where('user_id', Auth::id());
            }

            // Lọc theo status nếu có
            if ($request->has('status') && $request->query('status') !== 'all') {
                $query->where('status', $request->query('status'));
            }

            // Lọc theo category_id nếu có
            if ($request->has('category_id') && $request->query('category_id')) {
                $query->where('category_id', $request->query('category_id'));
            }

            // Tìm kiếm theo q (title, address)
            if ($request->has('q') && $request->query('q')) {
                $search = $request->query('q');
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('address', 'like', "%{$search}%")
                      ->orWhere('id', $search);
                });
            }

            // Phân trang nếu có
            $perPage = (int) $request->query('per_page', 15);
            $page = (int) $request->query('page', 1);
            
            if ($perPage > 0 && $request->has('page')) {
                $posts = $query->orderBy('created_at', 'desc')->paginate($perPage);
                $posts->getCollection()->transform(function ($post) {
                    return $this->preparePostForResponse($post);
                });
                
                return response()->json([
                    'status' => true,
                    'data'   => $posts->items(),
                    'meta'   => [
                        'current_page' => $posts->currentPage(),
                        'last_page' => $posts->lastPage(),
                        'per_page' => $posts->perPage(),
                        'total' => $posts->total(),
                    ],
                ]);
            }

            $posts = $query->orderBy('created_at', 'desc')->get();

            // Chuẩn hoá ảnh + main_image_url cho từng bài
            $posts = $posts->map(function ($post) {
                return $this->preparePostForResponse($post);
            });

            return response()->json([
                'status' => true,
                'data'   => $posts,
            ]);
        } catch (Exception $e) {
            Log::error('Lỗi lấy danh sách bài viết: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status'  => false,
                'message' => 'Không thể tải danh sách.',
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
                ->findOrFail($id);   // <-- quan trọng: $id phải là số id thật trong DB

            $post = $this->preparePostForResponse($post);

            return response()->json([
                'status' => true,
                'data'   => $post,
            ]);
        } catch (Exception $e) {
            Log::error('Lỗi xem bài viết: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status'  => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // =========================
    // POST api/posts  (tạo mới)
    // =========================
    public function store(Request $request)
    {
        try {
            $user = Auth::user();

            if (!in_array($user->role, ['lessor', 'admin'])) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Bạn không có quyền đăng bài.',
                ], 403);
            }

            $request->validate([
                'category_id'   => 'required|exists:categories,id',
                'title'         => 'required|string|max:255',
                'price'         => 'required|integer|min:0',
                'area'          => 'required|integer|min:1',
                'address'       => 'required|string|max:255',
                'content'       => 'nullable|string',
                'contact_phone' => 'nullable|string|max:20',
                'max_people'    => 'nullable|integer|min:1',
                'province_id'   => 'nullable|exists:provinces,id',
                'district_id'   => 'nullable|exists:districts,id',
                'ward_id'       => 'nullable|exists:wards,id',
            ]);

            $post = Post::create([
                'user_id'       => $user->id,
                'category_id'   => $request->category_id,
                'title'         => $request->title,
                'price'         => $request->price,
                'area'          => $request->area,
                'address'       => $request->address,
                'content'       => $request->input('content'),
                'contact_phone' => $request->contact_phone,
                'max_people'    => $request->max_people,
                'province_id'   => $request->province_id,
                'district_id'   => $request->district_id,
                'ward_id'       => $request->ward_id,
                'status'        => 'published',
                'published_at'  => now(),
            ]);

            if ($user->role === 'lessor') {
                foreach (User::admins()->get() as $admin) {
                    Notification::create([
                        'user_id' => $admin->id,
                        'type'    => 'post_created',
                        'content' => "{$user->name} vừa đăng bài: {$post->title}",
                    ]);
                }
            }

            return response()->json([
                'status'  => true,
                'message' => 'Thêm bài thành công.',
                'data'    => $post,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'status' => false,
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            Log::error('Lỗi thêm bài viết: ' . $e->getMessage());

            return response()->json([
                'status'  => false,
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
                return response()->json([
                    'status'  => false,
                    'message' => 'Không tìm thấy bài viết.',
                ], 404);
            }

            $user = Auth::user();

            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không có quyền đổi thumbnail.',
                ], 403);
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
                'model_id'   => $post->id,
                'public_id'  => $upload['public_id'],
                'url'        => $upload['secure_url'],
                'type'       => 'thumbnail',
            ]);

            return response()->json([
                'status'        => true,
                'message'       => 'Cập nhật thumbnail thành công.',
                'thumbnail_url' => $upload['secure_url'],
            ]);
        } catch (Exception $e) {
            Log::error("Lỗi cập nhật thumbnail: " . $e->getMessage());

            return response()->json([
                'status'  => false,
                'message' => 'Không thể cập nhật thumbnail.',
            ], 500);
        }
    }

    // =========================
    // PUT api/posts/{id} (sửa)
    // =========================
    public function update(Request $request, $id)
    {
        try {
            $post = Post::find($id);

            if (!$post) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không tìm thấy bài viết.',
                ], 404);
            }

            $user = Auth::user();

            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không có quyền sửa bài.',
                ], 403);
            }

            $post->update($request->only([
                'category_id',
                'title',
                'price',
                'area',
                'address',
                'content',
                'contact_phone',
                'status',
                'max_people',
                'province_id',
                'district_id',
                'ward_id',
            ]));

            return response()->json([
                'status'  => true,
                'message' => 'Cập nhật bài thành công.',
                'data'    => $post,
            ]);
        } catch (Exception $e) {
            Log::error('Lỗi cập nhật bài viết: ' . $e->getMessage());

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
            $post = Post::with('thumbnail')->find($id);

            if (!$post) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không tìm thấy bài viết.',
                ], 404);
            }

            $user = Auth::user();

            if ($user->role !== 'admin' && $post->user_id !== $user->id) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không có quyền xóa bài.',
                ], 403);
            }

            if ($post->thumbnail) {
                $this->cloudinary->delete($post->thumbnail->public_id);
                $post->thumbnail->delete();
            }

            $post->delete();

            return response()->json([
                'status'  => true,
                'message' => 'Xóa bài viết thành công.',
            ]);
        } catch (Exception $e) {
            Log::error('Lỗi xóa bài viết: ' . $e->getMessage());

            return response()->json([
                'status'  => false,
                'message' => 'Không thể xóa bài viết.',
            ], 500);
        }
    }
}
