import type { Meta, StoryObj } from '@storybook/react';

import loginPage from './loginPage';

const meta: Meta<typeof loginPage> = {
  component: loginPage,
};

export default meta;
type Story = StoryObj<typeof loginPage>;

export const Default: Story = {
  args: {
  },
};