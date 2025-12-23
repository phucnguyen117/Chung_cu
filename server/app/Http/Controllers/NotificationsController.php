<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    // GET /api/notifications
    public function index()
    {
        return response()->json([
            'status' => true,
            'data' => Notification::where('user_id', auth()->id())
                ->orderBy('created_at', 'DESC')
                ->get()
        ]);
    }

    // GET /api/notifications/unread-count
    public function unreadCount()
    {
        $count = Notification::where('user_id', auth()->id())
            ->where('is_read', false)
            ->count();

        return response()->json([
            'status' => true,
            'unread' => $count
        ]);
    }

    // POST /api/notifications/read/{id}
    public function markAsRead($id)
    {
        Notification::where('user_id', auth()->id())
            ->where('id', $id)
            ->update(['is_read' => true]);

        return response()->json([
            'status' => true,
            'message' => 'Đã đánh dấu là đã đọc'
        ]);
    }

    // POST /api/notifications/read-all
    public function markAll()
    {
        Notification::where('user_id', auth()->id())
            ->update(['is_read' => true]);

        return response()->json([
            'status' => true,
            'message' => 'Đã đọc toàn bộ thông báo'
        ]);
    }

    // DELETE /api/notifications/{id}
    public function destroy($id)
    {
        $deleted = Notification::where('user_id', auth()->id())
            ->where('id', $id)
            ->delete();

        if ($deleted) {
            return response()->json([
                'status' => true,
                'message' => 'Đã xoá thông báo'
            ]);
        }

        return response()->json([
            'status' => false,
            'message' => 'Không tìm thấy thông báo hoặc không có quyền'
        ], 404);
    }
}
