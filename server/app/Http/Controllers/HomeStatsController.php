<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class HomeStatsController extends Controller
{
    public function index()
    {
        // 1. Đang cho thuê (post published)
        $rooms = DB::table('posts')
            ->where('status', 'published')
            ->count();

        // 2. Chủ cho thuê
        $landlords = DB::table('users')
            ->whereIn('role', ['lessor', 'admin'])
            ->count();

        // 3. Tổng bài đăng
        $posts = DB::table('posts')->count();

        // 4. Đánh giá tích cực (rating = 5)
        $reviews = DB::table('reviews')
            ->where('rating', 5)
            ->count();

        return response()->json([
            'status' => true,
            'data' => [
                'rooms'     => $this->formatNumber($rooms),
                'landlords' => $this->formatNumber($landlords),
                'posts'     => $this->formatNumber($posts),
                'reviews'   => $this->formatNumber($reviews),
            ]
        ]);
    }

    private function formatNumber(int $number)
    {
        if ($number < 5) {
            return (string) $number;
        }

        if ($number < 10) {
            return '5+';
        }

        if ($number < 100) {
            return floor($number / 10) * 10 . '+';
        }

        if ($number < 1000) {
            return floor($number / 100) * 100 . '+';
        }

        if ($number < 10000) {
            return floor($number / 1000) . 'K+';
        }

        if ($number < 100000) {
            return floor($number / 10000) * 10 . 'K+';
        }

        if ($number < 1000000) {
            return floor($number / 100000) * 100 . 'K+';
        }

        return floor($number / 1000000) . 'M+';
    }
}
