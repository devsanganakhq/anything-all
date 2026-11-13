import { getToken } from '@auth/core/jwt';
import { ensureAppUserFromJwt } from '@/app/api/utils/ensureAppUser';

export async function GET(request) {
	const isSecure = process.env.AUTH_URL?.startsWith('https') ?? request.url?.startsWith('https') ?? false;
	const [token, jwt] = await Promise.all([
		getToken({
			req: request,
			secret: process.env.AUTH_SECRET,
			secureCookie: isSecure,
			raw: true,
		}),
		getToken({
			req: request,
			secret: process.env.AUTH_SECRET,
			secureCookie: isSecure,
		}),
	]);

	if (!jwt) {
		return new Response(
			`
			<html>
				<body>
					<script>
						(function () {
							var message = { type: 'AUTH_ERROR', error: 'Unauthorized' };
							if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
								window.ReactNativeWebView.postMessage(JSON.stringify(message));
							}
							if (window.parent && window.parent !== window) {
								window.parent.postMessage(message, '*');
							}
						})();
					</script>
				</body>
			</html>
			`,
			{
				status: 401,
				headers: {
					'Content-Type': 'text/html',
					'Cache-Control': 'no-store',
				},
			}
		);
	}

	await ensureAppUserFromJwt(jwt);

	const message = {
		type: 'AUTH_SUCCESS',
		jwt: token,
		user: {
			id: jwt.sub,
			email: jwt.email,
			name: jwt.name,
		},
	};

	return new Response(
		`
		<html>
			<body>
				<script>
					(function () {
						var message = ${JSON.stringify(message).replace(/</g, '\\u003c')};
						if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
							// The app applies a session once, so repeated posts are safe. They
							// cover a bridge that is not listening yet on the first post.
							var payload = JSON.stringify(message);
							[0, 400, 1200].forEach(function (delay) {
								setTimeout(function () {
									window.ReactNativeWebView.postMessage(payload);
								}, delay);
							});
							// Last resort: the app loads the token route inside the WebView
							// (where the session cookie lives) and reads it from there.
							setTimeout(function () {
								window.location.replace('/api/auth/token');
							}, 4000);
							return;
						}
						if (window.parent && window.parent !== window) {
							window.parent.postMessage(message, '*');
						} else {
							window.location.replace('/api/auth/token');
						}
					})();
				</script>
			</body>
		</html>
		`,
		{
			headers: {
				'Content-Type': 'text/html',
				'Cache-Control': 'no-store',
			},
		}
	);
}
