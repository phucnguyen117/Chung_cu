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
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/posts', [PostController::class, 'index']);
Route::get('/posts/{id}', [PostController::class, 'show']);

Route::get('/provinces', [LocationController::class, 'getProvinces']);
Route::get('/districts', [LocationController::class, 'getDistricts']);
Route::get('/wards', [LocationController::class, 'getWards']);

Route::get('/posts/{postId}/images', [PostImageController::class, 'index']);

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{id}', [CategoryController::class, 'show']);
Route::get('/categories/{id}/posts', [CategoryController::class, 'getPostsByCategory']);

Route::get('/amenities', [AmenityController::class, 'index']);
Route::get('/environment-features', [EnvironmentFeatureController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    // Auth (all)
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Posts (admin & lessor)
    Route::post('/posts', [PostController::class, 'store']);
    Route::put('/posts/{id}', [PostController::class, 'update']);
    Route::delete('/posts/{id}', [PostController::class, 'destroy']);

    // Post Images (admin & lessor)
    Route::post('/posts/{postId}/images', [PostImageController::class, 'store']);
    Route::put('/posts/images/{id}', [PostImageController::class, 'update']);
    Route::delete('/posts/images/{id}', [PostImageController::class, 'destroy']);

    // Province (admin)
    Route::post('/provinces', [LocationController::class, 'createProvince']);
    Route::put('/provinces/{id}', [LocationController::class, 'updateProvince']);
    Route::delete('/provinces/{id}', [LocationController::class, 'deleteProvince']);

    // District (admin)
    Route::post('/districts', [LocationController::class, 'createDistrict']);
    Route::put('/districts/{id}', [LocationController::class, 'updateDistrict']);
    Route::delete('/districts/{id}', [LocationController::class, 'deleteDistrict']);

    // Ward (admin)
    Route::post('/wards', [LocationController::class, 'createWard']);
    Route::put('/wards/{id}', [LocationController::class, 'updateWard']);
    Route::delete('/wards/{id}', [LocationController::class, 'deleteWard']);

    // Categories (admin)
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // Amenities (admin)
    Route::post('/amenities', [AmenityController::class, 'store']);
    Route::put('/amenities/{id}', [AmenityController::class, 'update']);
    Route::delete('/amenities/{id}', [AmenityController::class, 'destroy']);

    // Amenities - Gắn tiện ích vào bài viết (admin & lessor/ get all)
    Route::get('/posts/{postId}/amenities', [PostAmenityController::class, 'index']);
    Route::post('/posts/{postId}/amenities', [PostAmenityController::class, 'attach']);
    Route::delete('/posts/{postId}/amenities', [PostAmenityController::class, 'detach']);

    // EnvironmentFeatures (admin)
    Route::post('/environment-features', [EnvironmentFeatureController::class, 'store']);
    Route::put('/environment-features/{id}', [EnvironmentFeatureController::class, 'update']);
    Route::delete('/environment-features/{id}', [EnvironmentFeatureController::class, 'destroy']);

    // EnvironmentFeatures - Gắn đặc điểm môi trường (admin & lessor/ get all)
    Route::get('/posts/{postId}/environment', [PostEnvironmentController::class, 'index']);
    Route::post('/posts/{postId}/environment', [PostEnvironmentController::class, 'attach']);
    Route::delete('/posts/{postId}/environment', [PostEnvironmentController::class, 'detach']);
});



