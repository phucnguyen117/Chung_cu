<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RentalContract extends Model
{
    protected $table = 'rental_contracts';
    
    protected $fillable = [
        'post_id', 'user_id', 'start_date', 'end_date',
        'price', 'deposit', 'status'
    ];

    public function post() {
        return $this->belongsTo(Post::class);
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function payments() {
        return $this->hasMany(Payment::class);
    }
}
