<?php

namespace App\Http\Controllers;

use App\Models\LessorApplication;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LessorApplicationController extends Controller
{
    // USER GỬI YÊU CẦU
    public function apply(Request $request)
    {
        $user = Auth::user();

        if (in_array($user->role ?? 'user', ['lessor', 'admin'])) {
            return response()->json([
                'status'  => false,
                'message' => 'Tài khoản của bạn đã có quyền đăng tin.',
            ], 400);
        }

        $existing = LessorApplication::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn đã gửi yêu cầu và đang chờ duyệt.',
                'data'    => $existing,
            ], 400);
        }

        $application = LessorApplication::create([
            'user_id' => $user->id,
            'status'  => 'pending',
            'note'    => $request->input('note'),
        ]);

        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'title'   => 'Yêu cầu nâng cấp tài khoản chủ phòng',
                'body'    => $user->name . ' vừa gửi yêu cầu trở thành chủ phòng.',
                'type'    => 'lessor_request',
                'data'    => [
                    'application_id' => $application->id,
                    'user_id'        => $user->id,
                ],
            ]);
        }

        return response()->json([
            'status'  => true,
            'message' => 'Yêu cầu nâng cấp đã gửi tới admin. Vui lòng chờ phản hồi.',
            'data'    => $application,
        ]);
    }

    // USER XEM TRẠNG THÁI YÊU CẦU
    public function myRequest()
    {
        $user = Auth::user();

        $application = LessorApplication::where('user_id', $user->id)
            ->latest()
            ->first();

        return response()->json([
            'status' => true,
            'data'   => $application,
        ]);
    }

    // ADMIN LIST YÊU CẦU
    // public function adminIndex(Request $request)
    // {
    //     $admin = Auth::user();
    //     if (($admin->role ?? 'user') !== 'admin') {
    //         return response()->json(['message' => 'Forbidden'], 403);
    //     }

    //     $query = LessorApplication::with('user')->latest();

    //     if ($status = $request->get('status')) {
    //         $query->where('status', $status);
    //     }

    //     $applications = $query->paginate($request->get('per_page', 20));

    //     return response()->json([
    //         'status' => true,
    //         'data'   => $applications->items(),    // chỉ gửi array
    //         'meta'   => [
    //             'current_page' => $applications->currentPage(),
    //             'last_page'    => $applications->lastPage(),
    //             'per_page'     => $applications->perPage(),
    //             'total'        => $applications->total(),
    //         ],
    //     ]);
    // }
public function adminIndex(Request $request)
{
    $admin = Auth::user();
    if (($admin->role ?? 'user') !== 'admin') {
        return response()->json([
            'status' => false,
            'message' => 'Forbidden',
        ], 403);
    }

    $query = LessorApplication::with('user')->latest();

    if ($status = $request->get('status')) {
        $query->where('status', $status);
    }

    $applications = $query->paginate($request->get('per_page', 20));

    return response()->json([
        'status' => true,
        'data'   => $applications->items(), // ✅ ARRAY
        'meta'   => [
            'current_page' => $applications->currentPage(),
            'last_page'    => $applications->lastPage(),
            'total'        => $applications->total(),
        ]
    ]);
}


    // ADMIN DUYỆT
    public function approve($id)
    {
        $admin = Auth::user();
        if (($admin->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $application = LessorApplication::with('user')->findOrFail($id);

        $application->status = 'approved';
        $application->rejection_reason = null;
        $application->save();

        $user = $application->user;
        $user->role = 'lessor';
        $user->save();

        Notification::create([
            'user_id' => $user->id,
            'title'   => 'Yêu cầu nâng cấp tài khoản đã được duyệt',
            'body'    => 'Xin chúc mừng! Bạn đã được nâng cấp thành tài khoản chủ phòng.',
            'type'    => 'lessor_approved',
            'data'    => [
                'application_id' => $application->id,
            ],
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Đã duyệt yêu cầu.',
        ]);
    }

    // ADMIN TỪ CHỐI
    public function reject(Request $request, $id)
    {
        $admin = Auth::user();
        if (($admin->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $application = LessorApplication::with('user')->findOrFail($id);

        $reason = $request->input('reason', 'Yêu cầu của bạn chưa đáp ứng điều kiện hệ thống.');

        $application->status = 'rejected';
        $application->rejection_reason = $reason;
        $application->save();

        $user = $application->user;

        Notification::create([
            'user_id' => $user->id,
            'title'   => 'Yêu cầu nâng cấp tài khoản bị từ chối',
            'body'    => $reason,
            'type'    => 'lessor_rejected',
            'data'    => [
                'application_id' => $application->id,
            ],
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Đã từ chối yêu cầu.',
        ]);
    }

    // ADMIN XOÁ
    public function delete($id)
    {
        $admin = Auth::user();
        if (($admin->role ?? 'user') !== 'admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $application = LessorApplication::findOrFail($id);
        $application->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xoá yêu cầu.',
        ]);
    }
}
