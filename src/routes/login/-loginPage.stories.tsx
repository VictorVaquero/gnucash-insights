import type { Meta, StoryObj } from '@storybook/react';
import {http, HttpResponse, delay } from 'msw';
import { LoginPage } from '.';


const meta: Meta<typeof LoginPage> = {
  component: LoginPage,
};

export default meta;
type Story = StoryObj<typeof LoginPage>;

export const DefaultFailure: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('https://cognito-idp.eu-west-3.amazonaws.com/', async () => {
          await delay(10);
          return new HttpResponse(null, { status: 400, });
        }, {'once': false}),
      ],
    },
  },
};