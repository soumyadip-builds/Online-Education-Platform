// src/utils/youtube.js
export function getYouTubeIdFromUrl(url = '') {
	try {
		const u = new URL(url);
		if (u.hostname.includes('youtu.be')) {
			return u.pathname.slice(1);
		}
		if (u.hostname.includes('youtube.com')) {
			// watch?v=ID or embed/ID
			if (u.searchParams.get('v')) return u.searchParams.get('v');
			const parts = u.pathname.split('/');
			const embedIndex = parts.indexOf('embed');
			if (embedIndex !== -1 && parts[embedIndex + 1]) {
				return parts[embedIndex + 1];
			}
		}
	} catch (_) {
		// fallback for malformed URLs
		const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
		if (match) return match[1];
	}
	return null;
}
