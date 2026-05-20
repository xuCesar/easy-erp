import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/shadcn';

export function ShadcnBaselineTypecheck() {
  return (
    <Card className="border-primary/20 bg-card text-card-foreground">
      <CardHeader>
        <CardTitle>Phase 1.7</CardTitle>
        <CardDescription>Tailwind-first data cockpit baseline</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Input placeholder="factory uuid" />
        <div className="flex items-center gap-2">
          <Badge variant="success">正常</Badge>
          <Badge variant="warning">待处理</Badge>
          <Badge variant="locked">已锁定</Badge>
        </div>
        <Button>加载数据</Button>
      </CardContent>
    </Card>
  );
}
