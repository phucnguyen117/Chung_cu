<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Province extends Model
{
    protected $table = 'provinces';
    
    protected $fillable = ['code', 'name'];

    public $timestamps = false;

    public function districts() {
        return $this->hasMany(District::class);
    }

    public function posts() {
        return $this->hasMany(Post::class);
    }
}

