<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'content',
        'is_read'
    ];

    // Thông báo thuộc về 1 user
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
