/**
 * Loopback trust fence for the plugin's host route family (copied from the
 * dsh-web shared host slice): socket address, Host header, and browser
 * same-origin markers. The config-file route writes user-local data, so only
 * loopback (the desktop) may enter it.
 * @module dsh-evolve-in-git/loopback
 */
import type { IncomingMessage } from 'node:http';
/** IPv4 127/8 predicate (four decimal octets, first == 127). */
export declare function isIPv4Loopback(v4: string): boolean;
/** Whether a socket remote address names the loopback range (127/8, ::1, IPv4-mapped). */
export declare function isLoopbackAddress(address: string | undefined): boolean;
/** Whether a normalized URL hostname names the loopback authority (localhost, [::1], 127/8). */
export declare function isLoopbackHostname(hostname: string): boolean;
/**
 * Request-level trust fence: a loopback socket address AND a loopback Host
 * header, plus browser same-origin markers. The socket address is
 * authoritative; X-Forwarded-For is never trusted.
 */
export declare function isLoopbackRequest(request: IncomingMessage): boolean;
