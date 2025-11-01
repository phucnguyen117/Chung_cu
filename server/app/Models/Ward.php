<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ward extends Model
{
    protected $table = 'wards';
    protected $fillable = ['district_id', 'code', 'name'];

    public function district()
    {
        return $this->belongsTo(District::class);
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }
}
