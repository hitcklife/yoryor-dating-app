// tailwind.config.js
import gluestackPlugin from '@gluestack-ui/nativewind-utils/tailwind-plugin';

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    presets: [require("nativewind/preset")],
    plugins: [gluestackPlugin],
    theme: {
        extend: {},
    },
};
