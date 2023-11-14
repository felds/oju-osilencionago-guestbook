import basicSsl from "@vitejs/plugin-basic-ssl"
import { VitePWA } from "vite-plugin-pwa"

export default {
    plugins: [basicSsl(), VitePWA({ registerType: "autoUpdate" })],
}
