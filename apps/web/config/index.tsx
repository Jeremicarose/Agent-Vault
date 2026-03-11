import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { hedera, hederaTestnet } from '@reown/appkit/networks'

// Get project ID from environment
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
  console.warn('NEXT_PUBLIC_REOWN_PROJECT_ID is not set. Get one at https://cloud.reown.com/')
}

// Networks to support
export const networks = [hederaTestnet, hedera]

// Create wagmi adapter
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId: projectId ?? '',
  networks,
})

// Export wagmi config for use in providers
export const config = wagmiAdapter.wagmiConfig
