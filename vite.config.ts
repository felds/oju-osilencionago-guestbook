import basicSsl from "@vitejs/plugin-basic-ssl"
import { VitePWA } from "vite-plugin-pwa"

const pwaPlugin = VitePWA({
    registerType: "autoUpdate",
    devOptions: { enabled: true },
    manifest: {
        background_color: "#742134",
        icons: [{ src: "appicon-144-144.png", type: "image/png", sizes: "144x144" }],
    },
})

export default {
    plugins: [basicSsl(), pwaPlugin],
}
