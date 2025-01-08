import type { Preview } from "@storybook/react";
import '../src/index.css';
import React from "react";
import { initialize, mswLoader } from 'msw-storybook-addon';

/*
 * Initializes MSW
 * See https://github.com/mswjs/msw-storybook-addon#configuring-msw
 * to learn how to customize it
 */
initialize();
    
export const decorators = [
  (Story) => (
    <MemoryRouter initialEntries={['/']}>
      <Story />
    </MemoryRouter>
  ),
];

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      values: [
        // 👇 Default values
        { name: 'Dark', value: '#111' },
        { name: 'Light', value: '#F7F9F2' },
      ],
      // 👇 Specify which background is shown by default
      default: 'Dark',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  loaders: [mswLoader]
};

export default preview;
