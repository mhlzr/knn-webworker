function getRandomColors(amount) {
    var colors = [],
		angle = 360 / amount;
	
	var i;
	
    for (i = 0; i < amount; i++) {
        colors.push( hsvToRgb(angle * i, 95, 100) );
    }
    return colors;
}


function hsvToRgb(h, s, v) {
    var r, g, b;
    var i;
    var f, p, q, t;

    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s));
    v = Math.max(0, Math.min(100, v));

    s /= 100;
    v /= 100;

    if (s == 0) {
        r = g = b = v;
        return rgbToHex( (r * 255) | 0, (g * 255) | 0, (b * 255) | 0 );
    }

    h /= 60;
    i = Math.floor(h);
    f = h - i;
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));

    switch (i) {
    case 0:
        r = v;
        g = t;
        b = p;
        break;
    case 1:
        r = q;
        g = v;
        b = p;
        break;
    case 2:
        r = p;
        g = v;
        b = t;
        break;
    case 3:
        r = p;
        g = q;
        b = v;
        break;
    case 4:
        r = t;
        g = p;
        b = v;
        break;
    default:
        r = v;
        g = p;
        b = q;
    }

    return rgbToHex( (r * 255) | 0, (g * 255) | 0, (b * 255) | 0 );
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
