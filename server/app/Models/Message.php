<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'sender_id',
        'receiver_id',
        'post_id',
        'message',
        'is_read'
    ];

    // Người gửi
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    // Người nhận
    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    // Tin nhắn theo bài đăng (nếu chat vì 1 căn hộ)
    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}

