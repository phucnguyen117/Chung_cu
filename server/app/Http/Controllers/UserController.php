<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Notification;
use App\Models\LessorRequest;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash; 

class UserController extends Controller
{
    protected $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    /* ============================================================
     *  USER THƯỜNG: PROFILE, AVATAR, ĐỔI MẬT KHẨU
     * ============================================================ */

    // GET /api/user/profile  (hoặc /api/user nếu bạn map route vậy)
    public function profile()
    {
        $user = Auth::user()->load('avatarFile');

        $avatar = $user->avatarFile ? $user->avatarFile->url : null;

        return response()->json([
            'status' => true,
            'data'   => [
                'id'           => $user->id,
                'name'         => $user->name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
                'role'         => $user->role,
                'avatar_url'   => $avatar,
            ],
            // thêm cho tiện FE nào cần full
            'user'   => $user,
        ]);
    }

    // PUT /api/user/profile
    public function updateProfile(Request $request)
    {
        $user = Auth::user()->load('avatarFile');

        $request->validate([
            'name'         => 'nullable|string|max:255',
            'email'        => 'nullable|email|unique:users,email,' . $user->id,
            'phone_number' => 'nullable|regex:/^0[0-9]{9}$/|unique:users,phone_number,' . $user->id,
        ]);

        if ($request->filled('name')) {
            $user->name = $request->name;
        }
        if ($request->filled('email')) {
            $user->email = $request->email;
        }
        if ($request->filled('phone_number')) {
            $user->phone_number = $request->phone_number;
        }

        $user->save();
        $user->refresh()->load('avatarFile');

        $avatar = $user->avatarFile ? $user->avatarFile->url : null;

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật thông tin thành công.',
            'data'    => [
                'id'           => $user->id,
                'name'         => $user->name,
                'email'        => $user->email,
                'phone_number' => $user->phone_number,
                'role'         => $user->role,
                'avatar_url'   => $avatar,
            ],
            'user'    => $user,
        ]);
    }

    // POST /api/user/profile/avatar
    public function updateAvatar(Request $request)
    {
        $user = Auth::user()->load('avatarFile');

        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png|max:4096',
        ]);

        // Xóa avatar cũ nếu có
        if ($user->avatarFile) {
            $this->cloudinary->delete($user->avatarFile->public_id);
            $user->avatarFile->delete();
        }

        // Upload avatar mới lên Cloudinary
        $upload = $this->cloudinary->upload(
            $request->file('avatar')->getRealPath(),
            'user_avatars'
        );

        // Lưu bản ghi file
        $user->cloudinaryFiles()->create([
            'public_id' => $upload['public_id'],
            'url'       => $upload['secure_url'],
            'type'      => 'avatar',
        ]);

        // load lại để có avatarFile mới
        $user->refresh()->load('avatarFile');

        $avatar = $user->avatarFile ? $user->avatarFile->url : null;

        return response()->json([
            'status'      => true,
            'message'     => 'Cập nhật avatar thành công.',
            'avatar_url'  => $avatar,
            'user'        => $user,
        ]);
    }

    // PUT /api/user/change-password
    public function changePassword(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'current_password'          => 'required',
            'new_password'              => 'required|min:6|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status'  => false,
                'message' => 'Mật khẩu hiện tại không chính xác.',
            ], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'status'  => true,
            'message' => 'Đổi mật khẩu thành công.',
        ]);
    }

    /* ============================================================
     *  ADMIN: QUẢN LÝ USER & CẤP QUYỀN LESSOR
     * ============================================================ */

    // GET /api/admin/users
    public function adminIndex()
    {
        $admin = Auth::user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'status'  => false,
                'message' => 'Chỉ admin mới xem được danh sách người dùng.',
            ], 403);
        }

        $users = User::orderBy('created_at', 'desc')->get([
            'id',
            'name',
            'email',
            'phone_number',
            'role',
            'created_at',
        ]);

        return response()->json([
            'status' => true,
            'data'   => $users,
        ]);
    }

    // PUT /api/admin/users/{id}/role
    public function updateRole(Request $request, $id)
    {
        $admin = Auth::user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'status'  => false,
                'message' => 'Chỉ admin mới được đổi vai trò người dùng.',
            ], 403);
        }

        $request->validate([
            'role' => 'required|in:user,lessor,admin',
        ]);

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'status'  => false,
                'message' => 'Không tìm thấy người dùng.',
            ], 404);
        }

        // Không cho tự hạ quyền chính mình cho đỡ toang
        if ($user->id === $admin->id && $request->role !== 'admin') {
            return response()->json([
                'status'  => false,
                'message' => 'Không thể thay đổi vai trò của chính bạn.',
            ], 422);
        }

        $user->role = $request->role;
        $user->save();

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật vai trò thành công.',
            'data'    => $user,
        ]);
    }

    /* ============================================================
     *  LESSOR REQUEST: GỬI YÊU CẦU NÂNG CẤP
     * ============================================================ */

  // POST /api/user/request-lessor
public function requestLessor(Request $request)
{
    $user = Auth::user();

    // Nếu đã có quyền đăng bài -> không cho gửi yêu cầu
    if (in_array($user->role, ['lessor', 'admin'])) {
        return response()->json([
            'status' => false,
            'message' => 'Tài khoản này đã có quyền đăng bài (lessor/admin).',
        ], 422);
    }

    // Nếu đã có yêu cầu pending
    $existingRequest = LessorRequest::where('user_id', $user->id)
        ->where('status', 'pending')
        ->first();

    if ($existingRequest) {
        return response()->json([
            'status' => false,
            'message' => 'Bạn đã có yêu cầu đang chờ xử lý.',
        ], 422);
    }

    // ============================
    //  VALIDATE FORM
    // ============================
    $request->validate([
        'full_name'       => 'required|string|max:255',
        'email'           => 'required|email',
        'phone_number'    => 'required|string|regex:/^0[0-9]{9}$/',
        'date_of_birth'   => 'required|date',

        // Ảnh CCCD
        'cccd_front'      => 'required|image|mimes:jpg,jpeg,png|max:4096',
        'cccd_back'       => 'required|image|mimes:jpg,jpeg,png|max:4096',
    ]);

    // ============================
    //  UPLOAD CCCD MẶT TRƯỚC
    // ============================
    $frontUpload = $this->cloudinary->upload(
        $request->file('cccd_front')->getRealPath(),
        'cccd_images'
    );

    $frontUrl = $frontUpload['secure_url'];

    // ============================
    //  UPLOAD CCCD MẶT SAU
    // ============================
    $backUpload = $this->cloudinary->upload(
        $request->file('cccd_back')->getRealPath(),
        'cccd_images'
    );

    $backUrl = $backUpload['secure_url'];

    // ============================
    //  TẠO YÊU CẦU
    // ============================
    $lessorRequest = LessorRequest::create([
        'user_id'        => $user->id,
        'status'         => 'pending',

        // Thông tin cá nhân
        'full_name'      => $request->full_name,
        'email'          => $request->email,
        'phone_number'   => $request->phone_number,
        'date_of_birth'  => $request->date_of_birth,

        // Ảnh CCCD
        'cccd_front_url' => $frontUrl,
    'cccd_back_url'  => $backUrl,
    ]);

    // Gửi thông báo đến tất cả admin về yêu cầu mới (ngắn gọn: đăng ký làm chủ trọ)
    $message = "{$user->name} đã gửi đăng ký làm chủ trọ.";
    foreach (User::admins()->get() as $admin) {
        Notification::create([
            'user_id' => $admin->id,
            'type' => 'lessor_request',
            'content' => $message,
            'is_read' => false,
            'data' => ['user_id' => $user->id, 'lessor_request_id' => $lessorRequest->id],
        ]);
    }

    return response()->json([
        'status' => true,
        'message' => 'Yêu cầu nâng cấp đã được gửi.',
        'data' => $lessorRequest,
    ], 201);
}


    // GET /api/user/lessor-request-status
    public function getLessorRequestStatus()
    {
        $user = Auth::user();

        $lessorRequest = \App\Models\LessorRequest::where('user_id', $user->id)
            ->latest()
            ->first();

        if (!$lessorRequest) {
            return response()->json([
                'status' => true,
                'data' => null,
            ]);
        }

        return response()->json([
            'status' => true,
            'data' => [
                'id' => $lessorRequest->id,
                'status' => $lessorRequest->status,
                'rejection_reason' => $lessorRequest->rejection_reason,
                'created_at' => $lessorRequest->created_at,
                'updated_at' => $lessorRequest->updated_at,
            ],
        ]);
    }

    // GET /api/admin/lessor-requests
    public function adminLessorRequests()
    {
        $admin = Auth::user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'status' => false,
                'message' => 'Chỉ admin mới xem được danh sách yêu cầu.',
            ], 403);
        }

      $requests = LessorRequest::with('user')
    ->orderBy('created_at', 'desc')
    ->get();


        return response()->json([
            'status' => true,
            'data' => $requests->map(function ($req) {
                return [
                    'id' => $req->id,
                    'user_id' => $req->user_id,

                    // ====== THÔNG TIN USER ======
                    'full_name' => $req->full_name,
                    'email' => $req->email,
                    'phone_number' => $req->phone_number,
                    'date_of_birth' => $req->date_of_birth,

                    // ====== ẢNH CCCD ======
                    'cccd_front_url' => $req->cccd_front_url,
                    'cccd_back_url'  => $req->cccd_back_url,

                    // ====== TRẠNG THÁI ======
                    'status' => $req->status,
                    'rejection_reason' => $req->rejection_reason,
                    'created_at' => $req->created_at->format('H:i:s d/m/Y'),

                    // Thông tin user
                    'user' => [
                        'id' => $req->user->id,
                        'name' => $req->user->name,
                        'email' => $req->user->email,
                        'phone_number' => $req->user->phone_number,
                        'avatar' => $req->user->avatar ?? null,    
                    ],
                ];
            }),
        ]);
    }


    // POST /api/admin/lessor-requests/{id}/approve
    public function approveLessorRequest($id)
    {
        $admin = Auth::user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'status' => false,
                'message' => 'Chỉ admin mới được chấp nhận yêu cầu.',
            ], 403);
        }

        $lessorRequest = \App\Models\LessorRequest::find($id);

        if (!$lessorRequest) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy yêu cầu.',
            ], 404);
        }

        $lessorRequest->status = 'approved';
        $lessorRequest->rejection_reason = null;
        $lessorRequest->save();

        $user = $lessorRequest->user;
        $user->role = 'lessor';
        $user->save();

        // Thông báo cho user rằng yêu cầu đã được chấp nhận
        Notification::create([
            'user_id' => $user->id,
            'type' => 'lessor_approved',
            'content' => 'Yêu cầu đăng ký làm chủ trọ của bạn đã được chấp nhận.',
            'is_read' => false,
            'data' => ['lessor_request_id' => $lessorRequest->id],
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Yêu cầu đã được chấp nhận. User trở thành lessor.',
            'data' => [
                'lessor_request_id' => $lessorRequest->id,
                'user_id' => $user->id,
                'user_role' => $user->role,
            ],
        ]);
    }

    // POST /api/admin/lessor-requests/{id}/reject
    public function rejectLessorRequest(Request $request, $id)
    {
        $admin = Auth::user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'status' => false,
                'message' => 'Chỉ admin mới được từ chối yêu cầu.',
            ], 403);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $lessorRequest = \App\Models\LessorRequest::find($id);

        if (!$lessorRequest) {
            return response()->json([
                'status' => false,
                'message' => 'Không tìm thấy yêu cầu.',
            ], 404);
        }

        $lessorRequest->status = 'rejected';
        $lessorRequest->rejection_reason = $request->reason;
        $lessorRequest->save();

        // Thông báo cho user rằng yêu cầu đã bị từ chối cùng lý do
        Notification::create([
            'user_id' => $lessorRequest->user_id,
            'type' => 'lessor_rejected',
            'content' => 'Yêu cầu đăng ký làm chủ trọ của bạn đã bị từ chối. Lý do: ' . $lessorRequest->rejection_reason,
            'is_read' => false,
            'data' => ['lessor_request_id' => $lessorRequest->id],
        ]);

        return response()->json([
            'status' => true,
            'message' => 'Yêu cầu đã bị từ chối.',
            'data' => [
                'lessor_request_id' => $lessorRequest->id,
                'status' => $lessorRequest->status,
                'rejection_reason' => $lessorRequest->rejection_reason,
            ],
        ]);
    }
}
