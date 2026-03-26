<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pcs', function (Blueprint $table) {
            $table->id();
            $table->string('pc_name', 100)->unique();
            $table->string('ip_address', 45);
            $table->decimal('cpu_usage', 5, 2)->default(0.00)->comment('CPU usage percentage');
            $table->decimal('ram_usage', 5, 2)->default(0.00)->comment('RAM usage percentage');
            $table->decimal('ram_total', 10, 2)->default(0.00)->comment('Total RAM in GB');
            $table->decimal('ram_used', 10, 2)->default(0.00)->comment('Used RAM in GB');
            $table->string('os_info', 255)->nullable()->comment('Operating system info');
            $table->longText('screenshot')->nullable()->comment('Base64 encoded screenshot');
            $table->enum('status', ['online', 'offline'])->default('offline');
            $table->dateTime('last_seen')->nullable();
            $table->timestamps();
            
            $table->index('pc_name');
            $table->index('status');
            $table->index('last_seen');
        });

        Schema::create('commands', function (Blueprint $table) {
            $table->id();
            $table->string('pc_name', 100);
            $table->string('command_type', 50)->comment('lock, shutdown, restart, message, execute');
            $table->text('command_data')->nullable()->comment('Additional data (e.g., message text, command string)');
            $table->enum('status', ['pending', 'executed', 'failed'])->default('pending');
            $table->text('result')->nullable()->comment('Command execution result');
            $table->dateTime('created_at')->useCurrent();
            $table->dateTime('executed_at')->nullable();
            
            $table->index(['pc_name', 'status']);
            $table->index('status');
            
            $table->foreign('pc_name')->references('pc_name')->on('pcs')->onDelete('cascade')->onUpdate('cascade');
        });

        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->string('key_name', 100);
            $table->string('api_key', 64)->unique();
            $table->boolean('is_active')->default(1);
            $table->dateTime('created_at')->useCurrent();
            
            $table->index('api_key');
        });

        // Insert default API key
        DB::table('api_keys')->insert([
            'key_name' => 'default_client',
            'api_key' => 'icafe-monitor-api-key-2024-secure-token-abc123xyz',
            'created_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('api_keys');
        Schema::dropIfExists('commands');
        Schema::dropIfExists('pcs');
    }
};
