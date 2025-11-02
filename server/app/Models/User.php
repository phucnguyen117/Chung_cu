<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'users';
    
    protected $fillable = [
        'name', 'email', 'password', 'phone_number', 'avatar', 'role',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    public function posts() {
        return $this->hasMany(Post::class);
    }

    public function reviews() {
        return $this->hasMany(Review::class);
    }

    public function savedPosts() {
        return $this->belongsToMany(Post::class, 'saved_posts')->withTimestamps();
    }

    public function rentalContracts() {
        return $this->hasMany(RentalContract::class);
    }
}
