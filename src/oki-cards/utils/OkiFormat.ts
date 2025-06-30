import { CanvasRenderingContext2D } from "@napi-rs/canvas";

export function rect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rd: number = 5
): void {
    const radius = {
        tl: rd,
        tr: rd,
        br: rd,
        bl: rd,
    };

    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    ctx.fill();
}

export function number(number: number): string {
    return number.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

export function time(date: number): string {
    const seconds = Math.floor((new Date().getTime() - date) / 1000);

    let interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " лет";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " месяцев";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " дней";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " часов";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " минут";
    }
    return Math.floor(seconds) + " секунд";
}

export function numberSuffix(value: number, formatString = false): string {
    if (value >= 1000000000) {
        return (formatString ? number(Math.floor(value / 10 ** 8) / 10) : Math.floor(value / 10 ** 8) / 10) + "b";
    } else if (value >= 1000000) {
        return (formatString ? number(Math.floor(value / 10 ** 5) / 10) : Math.floor(value / 10 ** 5) / 10) + "m";
    } else {
        return formatString ? number(value) : value.toString();
    }
}

export function truncate(maxLength: number, string: string) {
    if (string.length > maxLength) {
        return string.slice(0, maxLength - 3) + "...";
    }

    return string;
}
