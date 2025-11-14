<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\EnvironmentFeature;
use Illuminate\Support\Str;
use Exception;

class EnvironmentFeatureController extends Controller
{
    // GET /api/environment-features
    public function index()
    {
        try {
            $features = EnvironmentFeature::orderBy('name')->get();
            return response()->json(['status' => true, 'data' => $features], 200);
        } catch (Exception $e) {
            Log::error('Lỗi lấy danh sách môi trường: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể tải danh sách.'], 500);
        }
    }

    // POST /api/environment-features (admin)
    public function store(Request $request)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới thêm.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255'
        ]);

        try {
            $slug = Str::slug($request->name);

            $feature = EnvironmentFeature::create([
                'name' => $request->name,
                'slug' => $slug
            ]);

            return response()->json([
                'status' => true,
                'message' => 'Thêm đặc điểm môi trường thành công.',
                'data' => $feature
            ], 201);

        } catch (Exception $e) {
            Log::error('Lỗi thêm đặc điểm môi trường: ' . $e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể thêm.'], 500);
        }
    }

    // PUT /api/environment-features/{id} (admin)
    public function update(Request $request, $id)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới sửa.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255'
        ]);

        $feature = EnvironmentFeature::find($id);
        if (!$feature) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy.'], 404);
        }

        $slug = Str::slug($request->name);

        $feature->update([
            'name' => $request->name,
            'slug' => $slug
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật thành công.',
            'data' => $feature
        ]);
    }

    // DELETE /api/environment-features/{id} (admin)
    public function destroy($id)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới xóa.'], 403);
        }

        $feature = EnvironmentFeature::find($id);
        if (!$feature) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy.'], 404);
        }

        $feature->delete();

        return response()->json(['status' => true, 'message' => 'Xóa thành công.']);
    }
}

