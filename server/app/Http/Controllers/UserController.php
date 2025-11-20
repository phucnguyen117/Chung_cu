<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class UserController extends Controller
{
    // GET /api/user/profile (xem thông tin cá nhân)
    public function profile()
    {
        $user = Auth::user();

        // Thêm avatar_url trực tiếp
        $data = $user->toArray();
        $data['avatar_url'] = $user->avatar ? asset('storage/' . $user->avatar) : null;

        return response()->json([
            'status' => true,
            'data' => $data
        ]);
    }

    // PUT /api/user/profile (cập nhật thông tin cá nhân)
    public function updateProfile(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'name'         => 'nullable|string|max:255',
            'email'        => 'nullable|email|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|string|regex:/^0[0-9]{9}$/|unique:users,phone_number,' . $user->id,
        ]);

        if ($request->filled('name')) $user->name = $request->name;
        if ($request->filled('email')) $user->email = $request->email;
        if ($request->filled('phone_number')) $user->phone_number = $request->phone_number;

        $user->save();

        // Trả về avatar_url
        $data = $user->toArray();
        $data['avatar_url'] = $user->avatar ? asset('storage/' . $user->avatar) : null;

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật thông tin thành công.',
            'data' => $data
        ]);
    }

    // POST /api/user/profile/avatar (cập nhật avatar)
    public function updateAvatar(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'avatar' => 'required|image|max:2048',
        ]);

        $file = $request->file('avatar');

        // Xóa avatar cũ nếu có
        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs('avatars', $filename, 'public');
        $user->avatar = $path;
        $user->save();

        return response()->json([
            'status' => true,
            'message' => 'Cập nhật avatar thành công.',
            'avatar_url' => asset('storage/' . $user->avatar)
        ]);
    }

    // PUT /api/user/change-password (đổi mật khẩu)
    public function changePassword(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6|confirmed'
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status' => false,
                'message' => 'Mật khẩu hiện tại không chính xác.'
            ], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'status' => true,
            'message' => 'Đổi mật khẩu thành công.'
        ]);
    }
}
