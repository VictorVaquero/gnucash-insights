import type { Preview } from "@storybook/react";
import '../src/index.css';
import { MemoryRouter } from "react-router-dom";
import React from "react";
    
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
};

export default preview;
