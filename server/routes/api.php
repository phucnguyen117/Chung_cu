<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PostImageController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\PostAmenityController;
use App\Http\Controllers\EnvironmentFeatureController;
use App\Http\Controllers\PostEnvironmentController;
use App\Http\Controllers\SavedPostController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\LessorApplicationController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\BlogTagController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\LessorController;
use Illuminate\Support\Facades\Route;

// ================== CHATBOT ==================
Route::post('/chatbot', [ChatbotController::class, 'sendMessage']);

// ================== AUTH PUBLIC ==================
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// ================== SEARCH PUBLIC ==================
Route::get('/blogs/search', [SearchController::class, 'blogSearch']);
Route::get('/posts/search', [SearchController::class, 'search']);
Route::get('/posts/{id}/similar', [SearchController::class, 'similarPosts']);

// ================== POSTS PUBLIC ==================
Route::get('/posts', [PostController::class, 'index']);
Route::get('/posts/{id}', [PostController::class, 'show']);

// ================== BLOGS PUBLIC ==================
Route::get('/blogs', [BlogController::class, 'index']);
Route::get('/blogs/{slug}', [BlogController::class, 'show']);
Route::get('/blog-tags', [BlogTagController::class, 'index']);
Route::get('/blog-tags/{slug}', [BlogTagController::class, 'show']);

// ================== LOCATION PUBLIC ==================
Route::get('/provinces', [LocationController::class, 'getProvinces']);
Route::get('/districts', [LocationController::class, 'getDistricts']);
Route::get('/wards', [LocationController::class, 'getWards']);

// ================== POST IMAGES PUBLIC ==================
Route::get('/posts/{postId}/images', [PostImageController::class, 'index']);

// ================== CATEGORIES PUBLIC ==================
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::get('/categories/{id}/posts', [CategoryController::class, 'getPostsByCategory']);

// ================== AMENITIES / ENV FEATURES PUBLIC ==================
Route::get('/amenities', [AmenityController::class, 'index']);
Route::get('/environment-features', [EnvironmentFeatureController::class, 'index']);

// ================== REVIEWS PUBLIC (xem) ==================
Route::get('/posts/{postId}/reviews', [ReviewController::class, 'index']);

// ================== FORGOT / RESET PASSWORD PUBLIC ==================
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetToken']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);

// =====================================================================
// ================== CÁC ROUTE CẦN AUTH SANCTUM =======================
// =====================================================================
Route::middleware('auth:sanctum')->group(function () {

    // -------- AUTH (ALL) --------
    Route::post('/logout', [AuthController::class, 'logout']);

    // -------- PROFILE (ALL) --------
    Route::get('user/profile', [UserController::class, 'profile']);
    Route::put('user/profile', [UserController::class, 'updateProfile']);
    Route::post('user/profile/avatar', [UserController::class, 'updateAvatar']);
    Route::put('user/change-password', [UserController::class, 'changePassword']);

    // =================================================================
    // ============== NHÓM ADMIN (PREFIX /admin) =======================
    // =================================================================
    Route::prefix('admin')->group(function () {

        // DASHBOARD STATS (tổng bài đăng, người dùng, đánh giá, bài lưu)
        // GET /api/admin/stats
        Route::get('/stats', [AdminDashboardController::class, 'stats']);

        // DANH SÁCH BÀI ĐĂNG CHO ADMIN
        // GET /api/admin/posts?status=&category_id=&q=&page=&per_page=
        Route::get('/posts', [AdminDashboardController::class, 'posts']);

        // Users admin
        Route::get('/users', [UserController::class, 'adminIndex']);
        Route::put('/users/{id}/role', [UserController::class, 'updateRole']);

        // Reviews admin
        Route::get('/reviews', [ReviewController::class, 'adminIndex']);
        Route::patch('/reviews/{id}/toggle', [ReviewController::class, 'adminToggleVisibility']);
        Route::delete('/reviews/{id}', [ReviewController::class, 'adminDestroy']);

        // Duyệt yêu cầu trở thành lessor
        // FE gọi: /api/admin/lessor/requests, /approve/{id}, /reject/{id}, /delete/{id}
        Route::get('/lessor/requests', [LessorApplicationController::class, 'adminIndex']);
        Route::post('/lessor/approve/{id}', [LessorApplicationController::class, 'approve']);
        Route::post('/lessor/reject/{id}', [LessorApplicationController::class, 'reject']);
        Route::delete('/lessor/delete/{id}', [LessorApplicationController::class, 'delete']);
    });

    // =================================================================
    // ================== POSTS (admin & lessor) ========================
    // =================================================================
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{id}', [PostController::class, 'update']);
    Route::delete('/posts/{id}', [PostController::class, 'destroy']);
    Route::post('/posts/{id}/thumbnail', [PostController::class, 'uploadThumbnail']);

    // Post Images (admin & lessor)
    Route::post('/posts/{postId}/images', [PostImageController::class, 'store']);
    Route::put('/posts/images/{id}', [PostImageController::class, 'update']);
    Route::delete('/posts/images/{id}', [PostImageController::class, 'destroy']);

    // =================================================================
    // ================== LOCATION (admin) ==============================
    // =================================================================
    // Province
    Route::post('/provinces', [LocationController::class, 'createProvince']);
    Route::put('/provinces/{id}', [LocationController::class, 'updateProvince']);
    Route::delete('/provinces/{id}', [LocationController::class, 'deleteProvince']);

    // District
    Route::post('/districts', [LocationController::class, 'createDistrict']);
    Route::put('/districts/{id}', [LocationController::class, 'updateDistrict']);
    Route::delete('/districts/{id}', [LocationController::class, 'deleteDistrict']);

    // Ward
    Route::post('/wards', [LocationController::class, 'createWard']);
    Route::put('/wards/{id}', [LocationController::class, 'updateWard']);
    Route::delete('/wards/{id}', [LocationController::class, 'deleteWard']);

    // =================================================================
    // ================== CATEGORIES (admin) ============================
    // =================================================================
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // =================================================================
    // ================== AMENITIES & ENV (admin & lessor) =============
    // =================================================================
    // Amenities (admin)
    Route::post('/amenities', [AmenityController::class, 'store']);
    Route::put('/amenities/{id}', [AmenityController::class, 'update']);
    Route::delete('/amenities/{id}', [AmenityController::class, 'destroy']);

    // Gắn tiện ích vào bài viết (admin & lessor/ get all)
    Route::get('/posts/{postId}/amenities', [PostAmenityController::class, 'index']);
    Route::post('/posts/{postId}/amenities', [PostAmenityController::class, 'attach']);
    Route::delete('/posts/{postId}/amenities', [PostAmenityController::class, 'detach']);

    // EnvironmentFeatures (admin)
    Route::post('/environment-features', [EnvironmentFeatureController::class, 'store']);
    Route::put('/environment-features/{id}', [EnvironmentFeatureController::class, 'update']);
    Route::delete('/environment-features/{id}', [EnvironmentFeatureController::class, 'destroy']);

    // Gắn đặc điểm môi trường (admin & lessor/ get all)
    Route::get('/posts/{postId}/environment', [PostEnvironmentController::class, 'index']);
    Route::post('/posts/{postId}/environment', [PostEnvironmentController::class, 'attach']);
    Route::delete('/posts/{postId}/environment', [PostEnvironmentController::class, 'detach']);

    // =================================================================
    // ================== SAVED POSTS (all logged-in) ===================
    // =================================================================
    Route::get('/saved-posts', [SavedPostController::class, 'index']);
    Route::post('/saved-posts/{postId}', [SavedPostController::class, 'save']);
    Route::delete('/saved-posts/{postId}', [SavedPostController::class, 'unsave']);

    // =================================================================
    // ================== REVIEWS (all logged-in) =======================
    // =================================================================
    // Trang tổng review cho toàn hệ thống (FE đang dùng /api/reviews ở trang đánh giá tổng)
    Route::get('/reviews', [ReviewController::class, 'all'])
        ->withoutMiddleware('auth:sanctum'); // cho phép public xem

    // xem review 1 post: đã có public ở trên: GET /posts/{postId}/reviews

    // tạo / sửa / xoá review: cần đăng nhập
    Route::post('/posts/{post}/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{id}', [ReviewController::class, 'update']);
    Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    // =================================================================
    // ================== APPOINTMENTS (đặt lịch xem phòng) ============
    // =================================================================
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::patch('/appointments/{id}/accept', [AppointmentController::class, 'accept']);
    Route::patch('/appointments/{id}/decline', [AppointmentController::class, 'decline']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'cancel']);
    Route::get('/appointments/my', [AppointmentController::class, 'myAppointments']);
    Route::get('/appointments/owner', [AppointmentController::class, 'ownerAppointments']);
    Route::get('/appointments/{id}', [AppointmentController::class, 'show']);

    // =================================================================
    // ================== NOTIFICATIONS (all logged-in) =================
    // =================================================================
    Route::get('/notifications', [NotificationsController::class, 'index']);
    Route::post('/notifications/read/{id}', [NotificationsController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationsController::class, 'markAll']);
    Route::get('/notifications/unread-count', [NotificationsController::class, 'unreadCount']);

    // =================================================================
    // ================== LESSOR APPLICATION (user) =====================
    // =================================================================
    Route::post('/lessor/apply', [LessorApplicationController::class, 'apply']);
    Route::get('/lessor/my', [LessorApplicationController::class, 'myRequest']);

    // =================================================================
    // ================== LESSOR DASHBOARD (lessor) =====================
    // =================================================================
    Route::get('/lessor/stats', [LessorController::class, 'stats']);
    Route::get('/lessor/reviews', [LessorController::class, 'reviews']);

    // =================================================================
    // ================== BLOGS / TAGS (admin) ==========================
    // =================================================================
    Route::post('/blogs', [BlogController::class, 'store']);
    Route::post('/blogs/{post}/update', [BlogController::class, 'update']);
    Route::delete('/blogs/{post}', [BlogController::class, 'destroy']);

    Route::post('/blog-tags', [BlogTagController::class, 'store']);
    Route::post('/blog-tags/{tag}/update', [BlogTagController::class, 'update']);
    Route::delete('/blog-tags/{tag}', [BlogTagController::class, 'destroy']);
});
