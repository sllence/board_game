import { PropsWithChildren } from 'react';
import { LucideTaroProvider } from 'lucide-react-taro';
import Taro from '@tarojs/taro';
import '@/app.css';
import { Toaster } from '@/components/ui/toast';
import { Preset } from './presets';

// three.js 小程序适配
if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
  require('@minisheep/mini-program-polyfill-core/wechat-polyfill');
  require('@minisheep/three-platform-adapter/wechat');
}

const App = ({ children }: PropsWithChildren) => {
  return (
    <LucideTaroProvider defaultColor="#000" defaultSize={24}>
      <Preset>{children}</Preset>
      <Toaster />
    </LucideTaroProvider>
  );
};

export default App;
