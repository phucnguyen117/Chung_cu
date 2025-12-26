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
use App\Http\Controllers\HomeStatsController;
use Illuminate\Support\Facades\Route;

Route::options('/{any}', function () {
    return response()->json([], 200);
})->where('any', '.*');

Route::get('/home-stats', [HomeStatsController::class, 'index']);

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
Route::get('/home/stats', [PostController::class, 'getHomeStats']);


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


// ================== REVIEWS PUBLIC ==================
// Public: get all reviews across the system
Route::get('/reviews', [ReviewController::class, 'all']);
Route::get('/posts/{postId}/reviews', [ReviewController::class, 'index']);
Route::get('/posts/{postId}/review-tree', [ReviewController::class, 'getTree']);

// ================== FORGOT / RESET PASSWORD PUBLIC ==================
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetToken']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);


// =====================================================================
// ================== ROUTE CẦN AUTH SANCTUM ============================
// =====================================================================
Route::middleware('auth:sanctum')->group(function () {

    // -------- AUTH --------
    Route::post('/logout', [AuthController::class, 'logout']);


    // -------- PROFILE --------
    Route::get('user/profile', [UserController::class, 'profile']);
    Route::put('user/profile', [UserController::class, 'updateProfile']);
    Route::post('user/profile/avatar', [UserController::class, 'updateAvatar']);
    Route::put('user/change-password', [UserController::class, 'changePassword']);


    // -------- USER REQUEST LESSOR --------
    Route::post('user/request-lessor', [UserController::class, 'requestLessor']);
    Route::get('user/lessor-request-status', [UserController::class, 'getLessorRequestStatus']);


    // ================== REVIEW TREE ==================
  

    // create a review for a post
    Route::post('/posts/{postId}/reviews', [ReviewController::class, 'store']);
// ===== REVIEW (EDIT / DELETE) =====
Route::put('/reviews/{id}', [ReviewController::class, 'update']);
Route::delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    Route::put('/replies/{id}', [ReviewController::class, 'updateReply']);

    Route::delete('/replies/{id}', [ReviewController::class, 'deleteReply']);

    // reply to a review
    Route::post('/reviews/{id}/replies', [ReviewController::class, 'replyReview']);

    // reply to an existing reply (child)
    Route::post('/replies/{id}/child', [ReviewController::class, 'replyChild']);


    // =================================================================
    // ================== ADMIN (PREFIX /admin) =========================
    // =================================================================
    Route::prefix('admin')->group(function () {
        // ================== BLOG ADMIN ==================
        Route::post('/blogs', [BlogController::class, 'store']);
        Route::put('/blogs/{id}', [BlogController::class, 'update']);
        Route::delete('/blogs/{id}', [BlogController::class, 'destroy']);

        Route::get('/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/posts', [AdminDashboardController::class, 'posts']);

        Route::get('/users', [UserController::class, 'adminIndex']);
        Route::put('/users/{id}/role', [UserController::class, 'updateRole']);

        Route::get('/lessor-requests', [UserController::class, 'adminLessorRequests']);
        Route::post('/lessor-requests/{id}/approve', [UserController::class, 'approveLessorRequest']);
        Route::post('/lessor-requests/{id}/reject', [UserController::class, 'rejectLessorRequest']);
        Route::delete('/lessor-requests/{id}', [UserController::class, 'deleteLessorRequest']);

        Route::get('/lessor/requests', [LessorApplicationController::class, 'adminIndex']);
        Route::post('/lessor/approve/{id}', [LessorApplicationController::class, 'approve']);
        Route::post('/lessor/reject/{id}', [LessorApplicationController::class, 'reject']);
        Route::delete('/lessor/delete/{id}', [LessorApplicationController::class, 'delete']);

        Route::get('/reviews', [ReviewController::class, 'adminIndex']);
        Route::patch('/reviews/{id}/toggle', [ReviewController::class, 'adminToggleVisibility']);
        Route::delete('/reviews/{id}', [ReviewController::class, 'adminDestroy']);
    
        Route::get('/saved-posts', [SavedPostController::class, 'adminIndex']);
        Route::delete('/saved-posts/{id}', [SavedPostController::class, 'adminDelete']);
    });


    // =================================================================
    // ================== 🔥 LESSOR POSTS (CHỈ THÊM CHỖ NÀY) 🔥 ==========
    // =================================================================
    // LESSOR  → chỉ thấy post của chính mình
    // ADMIN   → thấy toàn bộ
    Route::get('/lessor/posts', [PostController::class, 'index']);


    // =================================================================
    // ================== POSTS (admin & lessor) ========================
    // =================================================================
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{id}', [PostController::class, 'update']);
    Route::delete('/posts/{id}', [PostController::class, 'destroy']);
    Route::post('/posts/{id}/thumbnail', [PostController::class, 'uploadThumbnail']);

    Route::post('/posts/{postId}/images', [PostImageController::class, 'store']);
    Route::put('/posts/images/{id}', [PostImageController::class, 'update']);
    Route::delete('/posts/images/{id}', [PostImageController::class, 'destroy']);
Route::put('/posts/{id}/status', [PostController::class, 'updateStatus']);

    // =================================================================
    // ================== LOCATION (admin) ==============================
    // =================================================================
    Route::post('/provinces', [LocationController::class, 'createProvince']);
    Route::put('/provinces/{id}', [LocationController::class, 'updateProvince']);
    Route::delete('/provinces/{id}', [LocationController::class, 'deleteProvince']);

    Route::post('/districts', [LocationController::class, 'createDistrict']);
    Route::put('/districts/{id}', [LocationController::class, 'updateDistrict']);
    Route::delete('/districts/{id}', [LocationController::class, 'deleteDistrict']);

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
    // ================== SAVED POSTS ==================================
    // =================================================================
    Route::get('/saved-posts', [SavedPostController::class, 'index']);
    Route::post('/saved-posts/{postId}', [SavedPostController::class, 'save']);
    Route::delete('/saved-posts/{postId}', [SavedPostController::class, 'unsave']);
    Route::get('/saved-posts/ids', [SavedPostController::class, 'getSavedIds']);
    Route::get('/saved-posts/check/{postId}', [SavedPostController::class, 'checkSaved']);


    // =================================================================
    // ================== APPOINTMENTS =================================
    // =================================================================
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::patch('/appointments/{id}/accept', [AppointmentController::class, 'accept']);
    Route::patch('/appointments/{id}/decline', [AppointmentController::class, 'decline']);
    Route::delete('/appointments/{id}', [AppointmentController::class, 'cancel']);
    Route::get('/appointments/my', [AppointmentController::class, 'myAppointments']);
    Route::get('/appointments/owner', [AppointmentController::class, 'ownerAppointments']);
    Route::get('/appointments/{id}', [AppointmentController::class, 'show']);


    // =================================================================
    // ================== NOTIFICATIONS ================================
    // =================================================================
    Route::get('/notifications', [NotificationsController::class, 'index']);
    Route::post('/notifications/read/{id}', [NotificationsController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationsController::class, 'markAll']);
    Route::get('/notifications/unread-count', [NotificationsController::class, 'unreadCount']);
    Route::delete('/notifications/{id}', [NotificationsController::class, 'destroy']);


    // =================================================================
    // ================== LESSOR DASHBOARD ==============================
    // =================================================================
    Route::get('/lessor/stats', [LessorController::class, 'stats']);
    Route::get('/lessor/reviews', [LessorController::class, 'reviews']);
});

