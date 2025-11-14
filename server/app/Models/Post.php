<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $table = 'posts';
    
    protected $fillable = [
        'user_id', 'category_id', 'title', 'price', 'area', 'address',
        'province_id', 'district_id', 'ward_id', 'lat', 'lng',
        'content', 'status', 'published_at', 'max_people', 'contact_phone'
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function category() {
        return $this->belongsTo(Category::class);
    }

    public function province() {
        return $this->belongsTo(Province::class);
    }

    public function district() {
        return $this->belongsTo(District::class);
    }

    public function ward() {
        return $this->belongsTo(Ward::class);
    }

    public function images() {
        return $this->hasMany(PostImage::class);
    }

    public function amenities() {
        return $this->belongsToMany(Amenity::class, 'amenity_post', 'post_id', 'amenity_id');
    }

    public function environmentFeatures() {
        return $this->belongsToMany(EnvironmentFeature::class, 'environment_post', 'post_id', 'environment_id');
    }

    public function reviews() {
        return $this->hasMany(Review::class);
    }

    public function savedByUsers() {
        return $this->belongsToMany(User::class, 'saved_posts');
    }

    public function rentalContracts() {
        return $this->hasMany(RentalContract::class);
    }
}

