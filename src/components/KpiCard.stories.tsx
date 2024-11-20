import type { Meta, StoryObj } from '@storybook/react';

import { KpiCard } from './KpiCard';

const meta: Meta<typeof KpiCard> = {
  component: KpiCard,
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

export const ShortKpi: Story = {
  args: {
    name: "Short Kpi",
    value: 100,
    title: "My kpi",
    color: "text-green-600"
  },
};

export const LongKpiName: Story = {
  args: {
    name: "Really loooong KPI With lots of data",
    value: "100%",
    title: "",
    color: "text-green-600"
  }
};