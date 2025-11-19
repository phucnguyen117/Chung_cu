<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Post;
use App\Models\Notification;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    // POST /api/appointments (tạo lịch hẹn xem nhà)
    public function store(Request $request)
    {
        $validated = $request->validate([
            'post_id' => 'required|exists:posts,id',
            'appointment_time' => 'required|date|after:now',
            'note' => 'nullable|string'
        ]);

        $post = Post::findOrFail($validated['post_id']);

        $ownerId = $post->user_id;        // chủ bài đăng
        $renterId = auth()->id();         // người thuê

        if ($ownerId == $renterId) {
            return response()->json(['error' => 'Không thể đặt lịch xem căn hộ của chính bạn'], 400);
        }

        $appointment = Appointment::create([
            'post_id' => $post->id,
            'renter_id' => $renterId,
            'owner_id' => $ownerId,
            'appointment_time' => $validated['appointment_time'],
            'note' => $validated['note'] ?? null,
            'status' => 'pending'
        ]);

        // Thông báo cho chủ nhà
        Notification::create([
            'user_id' => $ownerId,
            'type' => 'appointment_new',
            'content' => "Bạn có yêu cầu đặt lịch hẹn mới từ người thuê cho bài đăng #{$post->id}",
        ]);

        return response()->json([
            'message' => 'Đặt lịch hẹn thành công. Chờ chủ nhà xác nhận.',
            'appointment' => $appointment
        ]);
    }


    // PATCH /api/appointments/{id}/accept (Lessor đồng ý lịch)
    public function accept($id)
    {
        $appointment = Appointment::findOrFail($id);

        if ($appointment->owner_id !== auth()->id()) {
            return response()->json(['error' => 'Không có quyền duyệt'], 403);
        }

        if ($appointment->status !== 'pending') {
            return response()->json(['error' => 'Không thể cập nhật. Lịch đã được xử lý.'], 400);
        }

        $appointment->update(['status' => 'accepted']);

        Notification::create([
            'user_id' => $appointment->renter_id,
            'type' => 'appointment_accepted',
            'content' => 'Chủ nhà đã chấp nhận lịch hẹn của bạn.'
        ]);

        return response()->json(['message' => 'Đã duyệt lịch hẹn']);
    }


    // PATCH /api/appointments/{id}/decline (lessor từ chối lịch)
    public function decline($id)
    {
        $appointment = Appointment::findOrFail($id);

        if ($appointment->owner_id !== auth()->id()) {
            return response()->json(['error' => 'Không có quyền từ chối'], 403);
        }

        if ($appointment->status !== 'pending') {
            return response()->json(['error' => 'Không thể cập nhật. Lịch đã được xử lý.'], 400);
        }

        $appointment->update(['status' => 'declined']);

        Notification::create([
            'user_id' => $appointment->renter_id,
            'type' => 'appointment_declined',
            'content' => 'Chủ nhà đã từ chối lịch hẹn của bạn.'
        ]);

        return response()->json(['message' => 'Đã từ chối lịch hẹn']);
    }


    // DELETE /api/appointments/{id} (user hủy lịch hẹn)
    public function cancel($id)
    {
        $appointment = Appointment::findOrFail($id);

        if ($appointment->renter_id !== auth()->id()) {
            return response()->json(['error' => 'Bạn không thể hủy lịch người khác'], 403);
        }

        if ($appointment->status !== 'pending') {
            return response()->json(['error' => 'Không thể hủy. Lịch đã được xử lý.'], 400);
        }

        $appointment->update(['status' => 'cancelled']);

        Notification::create([
            'user_id' => $appointment->owner_id,
            'type' => 'appointment_cancelled',
            'content' => 'Người thuê đã hủy lịch hẹn.'
        ]);

        return response()->json(['message' => 'Đã hủy lịch hẹn']);
    }


    // GET /api/appointments/my (user xem lịch của mình)
    public function myAppointments()
    {
        $data = Appointment::where('renter_id', auth()->id())
            ->with('post')
            ->orderBy('appointment_time', 'DESC')
            ->get();

        return response()->json($data);
    }


    // GET /api/appointments/owner (lessor hoặc admin xem lịch của họ)
    public function ownerAppointments()
    {
        // ROLE VALIDATION
        if (!in_array(auth()->user()->role, ['lessor', 'admin'])) {
            return response()->json(['error' => 'Bạn không có quyền truy cập'], 403);
        }

        $data = Appointment::where('owner_id', auth()->id())
            ->with(['post', 'renter'])
            ->orderBy('appointment_time', 'ASC')
            ->get();

        return response()->json($data);
    }


    // GET /api/appointments/{id} (chi tiết 1 lịch hẹn)
    public function show($id)
    {
        $appointment = Appointment::with(['post', 'renter', 'owner'])
            ->findOrFail($id);

        if (auth()->id() !== $appointment->renter_id &&
            auth()->id() !== $appointment->owner_id &&
            auth()->user()->role !== 'admin') 
        {
            return response()->json(['error' => 'Không có quyền xem lịch này'], 403);
        }

        return response()->json($appointment);
    }
}
