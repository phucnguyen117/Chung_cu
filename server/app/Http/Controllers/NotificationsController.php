<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationsController extends Controller
{
    // GET /api/notifications (lấy danh sách thông báo)
    public function index()
    {
        $notifications = Notification::where('user_id', auth()->id())
            ->orderBy('created_at', 'DESC')
            ->get();

        return response()->json($notifications);
    }


    // POST /api/notifications/read/{id} (Đánh dấu 1 thông báo là đã đọc)
    public function markAsRead($id)
    {
        $noti = Notification::where('user_id', auth()->id())->findOrFail($id);

        $noti->update(['is_read' => true]);

        return response()->json(['message' => 'Đã đánh dấu là đã đọc']);
    }


    // POST /api/notifications/read-all (Đánh dấu tất cả thông báo là đã đọc)
    public function markAll()
    {
        Notification::where('user_id', auth()->id())
            ->update(['is_read' => true]);

        return response()->json(['message' => 'Đã đọc tất cả thông báo']);
    }


    // GET /api/notifications/unread-count (Đếm số thông báo chưa đọc)
    public function unreadCount()
    {
        $count = Notification::where('user_id', auth()->id())
            ->where('is_read', false)
            ->count();

        return response()->json(['unread' => $count]);
    }
}
