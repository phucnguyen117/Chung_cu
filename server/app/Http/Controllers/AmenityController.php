<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Amenity;
use Illuminate\Support\Str;
use Exception;

class AmenityController extends Controller
{
    // GET /api/amenities
    public function index()
    {
        try {
            $data = Amenity::orderBy('name')->get();
            return response()->json(['status' => true, 'data' => $data], 200);
        } catch (Exception $e) {
            Log::error('Lỗi lấy danh sách tiện ích: '.$e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể tải danh sách tiện ích.'], 500);
        }
    }

    // POST /api/amenities (admin)
    public function store(Request $request)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới thêm tiện ích.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255'
        ]);

        try {

            $slug = Str::slug($request->name);

            $amenity = Amenity::create([
                'name' => $request->name,
                'slug' => $slug
            ]);

            return response()->json([
                'status'  => true,
                'message' => 'Thêm tiện ích thành công.',
                'data'    => $amenity
            ], 201);

        } catch (Exception $e) {
            Log::error('Lỗi thêm tiện ích: '.$e->getMessage());
            return response()->json(['status' => false, 'message' => 'Không thể thêm tiện ích.'], 500);
        }
    }

    // PUT /api/amenities/{id} (admin)
    public function update(Request $request, $id)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới sửa tiện ích.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255'
        ]);

        $amenity = Amenity::find($id);
        if (!$amenity) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy tiện ích.'], 404);
        }

        $slug = Str::slug($request->name);

        $amenity->update([
            'name' => $request->name,
            'slug' => $slug
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật tiện ích thành công.',
            'data' => $amenity
        ]);
    }

    // DELETE /api/amenities/{id} (admin)
    public function destroy($id)
    {
        if (Auth::user()->role !== 'admin') {
            return response()->json(['status' => false, 'message' => 'Chỉ admin mới xóa tiện ích.'], 403);
        }

        $amenity = Amenity::find($id);
        if (!$amenity) {
            return response()->json(['status' => false, 'message' => 'Không tìm thấy tiện ích.'], 404);
        }

        $amenity->delete();

        return response()->json(['status' => true, 'message' => 'Xóa tiện ích thành công.']);
    }
}
