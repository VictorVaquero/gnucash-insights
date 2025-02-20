import type { Meta, StoryObj } from '@storybook/react';
import { TreeList } from './TreeList';
import { toHierarchy } from '@/common/toHierarchy';

const data = [
  {
    name: 'Hierarchy a',
    id: 'a',
    parent: '',
    value: 1
  },
  {
    name: 'Hierarchy b',
    id: 'b',
    parent: 'a',
    value: 2
  },
  {
    name: 'Hierarchy c',
    id: 'c',
    parent: 'a',
    value: 2
  },
  {
    name: 'Hierarchy d',
    id: 'd',
    parent: 'b',
    value: 3
  }
]

const head = data.filter((d) => d.id === 'a')[0];
const hierarchy = toHierarchy(head,
  data!.filter((d) => d.id !== head.id),
  (d) => d.id,
  (d) => d.parent ?? '',
  (a, b) => a.value > b.value ? -1 : 1,
  (d) => <div className='w-full flex flex-row gap-x-6 py-4 border-b border-shark-500'>{d.name}</div>
);

const meta: Meta<typeof TreeList> = {
  component: TreeList,
};

export default meta;
type Story = StoryObj<typeof TreeList>;

export const Default: Story = {
  args: {
    data: [hierarchy],
    className: 'text-white'
  },
};
