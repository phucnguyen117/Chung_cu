<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = [
        'post_id',
        'renter_id',
        'owner_id',
        'appointment_time',
        'status',
        'note'
    ];

    // User đặt lịch
    public function renter()
    {
        return $this->belongsTo(User::class, 'renter_id');
    }

    // Chủ nhà
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    // Bài đăng liên quan
    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
