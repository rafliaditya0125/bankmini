@php
    $appName = \App\Models\Setting::get('app_name', config('app.name'));
@endphp
<x-mail::message>
# {{ $title }}

{{ $message }}

Jika Anda tidak merasa melakukan transaksi ini, segera hubungi petugas {{ $appName }}.

Terima kasih,<br>
{{ $appName }}
</x-mail::message>
