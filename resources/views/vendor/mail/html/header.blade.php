@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block; text-align: center;">
<img src="{{ rtrim(config('app.url'), '/') }}/images/bankmini-removebg-preview.png" class="logo" alt="Logo" style="width: auto; height: 60px; margin-bottom: 12px; display: inline-block;">
<br>
{!! $slot !!}
</a>
</td>
</tr>
