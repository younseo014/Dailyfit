"use client";

import { FormEvent, useMemo, useState } from "react";

type OrderStatus = "pending" | "done";

type Order = {
  id: number;
  item: string;
  quantity: string;
  vendor: string;
  category: string;
  status: OrderStatus;
  rewarded: boolean;
  createdAt: string;
};

type Memo = {
  id: number;
  body: string;
  tags: string[];
  score: number;
  createdAt: string;
};

type PointLog = {
  id: number;
  label: string;
  amount: number;
  type: "order" | "memo" | "bonus" | "exchange";
};

const industryTemplates = {
  convenience: {
    label: "편의점",
    items: [
      ["삼각김밥", "24개", "푸드온"],
      ["생수 500ml", "2박스", "해맑은물류"],
      ["바나나 우유", "18개", "밀크라인"],
    ],
  },
  cafe: {
    label: "카페",
    items: [
      ["원두 블렌드", "5kg", "로스터리봄"],
      ["오트 밀크", "12개", "데일리유통"],
      ["테이크아웃 컵", "1박스", "패키지허브"],
    ],
  },
  salon: {
    label: "미용실",
    items: [
      ["컬러 크림 7N", "6개", "헤어프로"],
      ["산화제 6%", "4개", "뷰티서플라이"],
      ["위생 타월", "30장", "클린샵"],
    ],
  },
};

const initialOrders: Order[] = [
  {
    id: 1,
    item: "도시락 김치볶음",
    quantity: "18개",
    vendor: "푸드온",
    category: "편의점",
    status: "pending",
    rewarded: false,
    createdAt: "오늘 08:20",
  },
  {
    id: 2,
    item: "아이스컵 대형",
    quantity: "3박스",
    vendor: "해맑은물류",
    category: "편의점",
    status: "done",
    rewarded: true,
    createdAt: "오늘 07:45",
  },
  {
    id: 3,
    item: "커피 우유",
    quantity: "20개",
    vendor: "밀크라인",
    category: "편의점",
    status: "pending",
    rewarded: false,
    createdAt: "어제 17:10",
  },
];

const initialMemos: Memo[] = [
  {
    id: 1,
    body: "오후에 단골 손님 선불권 확인. 다음 방문 때 커트 예약 잡기.",
    tags: ["#손님", "#예약"],
    score: 0,
    createdAt: "오늘 09:15",
  },
  {
    id: 2,
    body: "저거 신상품 행사대 쪽 재고 다시 확인.",
    tags: ["#재고", "#할일"],
    score: 10,
    createdAt: "어제 19:30",
  },
];

const initialPointLogs: PointLog[] = [
  { id: 1, label: "아이스컵 대형 발주 완료", amount: 2, type: "order" },
  { id: 2, label: "업무 메모 작성", amount: 1, type: "memo" },
  { id: 3, label: "7일 연속 사용 보너스", amount: 50, type: "bonus" },
];

const screeningRules = [
  { label: "지시 대명사", examples: ["저거", "그거", "이거"], weight: 10 },
  {
    label: "명칭 망각 표현",
    examples: ["뭐더라", "있잖아", "어..."],
    weight: 25,
  },
  { label: "기록 완성도 저하", examples: ["나중에", "대충"], weight: 20 },
];

const memoryProducts = ["삼각김밥", "생수", "커피 우유", "아이스컵"];
const reverseNumber = "4186";

function analyzeText(text: string) {
  return screeningRules.reduce((sum, rule) => {
    const hit = rule.examples.some((word) => text.includes(word));
    return hit ? sum + rule.weight : sum;
  }, 0);
}

function inferTags(text: string) {
  const tags = new Set<string>();
  if (/손님|예약|단골/.test(text)) tags.add("#손님");
  if (/거래처|업체|납품/.test(text)) tags.add("#거래처");
  if (/재고|발주|품목|상품/.test(text)) tags.add("#재고");
  if (/오늘|확인|처리|나중/.test(text)) tags.add("#할일");
  if (tags.size === 0) tags.add("#메모");
  return Array.from(tags);
}

function getScoreLabel(score: number) {
  if (score >= 40) return "점검 권장";
  if (score >= 24) return "보통";
  return "활발";
}

function getScoreTone(score: number) {
  if (score >= 40) return "border-rose-200 bg-rose-50 text-rose-900";
  if (score >= 24) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("home");
  const [industry, setIndustry] =
    useState<keyof typeof industryTemplates>("convenience");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [pointLogs, setPointLogs] = useState<PointLog[]>(initialPointLogs);
  const [orderItem, setOrderItem] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderVendor, setOrderVendor] = useState("");
  const [memoText, setMemoText] = useState("");
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [patternConsent, setPatternConsent] = useState(false);
  const [testAnswers, setTestAnswers] = useState({
    products: "",
    order: "",
    reverse: "",
  });
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [watch, setWatch] = useState({ heart: 68, sleep: 5.5, activity: 34 });

  const points = pointLogs.reduce((sum, log) => sum + log.amount, 0);
  const completedOrders = orders.filter((order) => order.status === "done");
  const todayPoints = pointLogs
    .slice(0, 4)
    .reduce((sum, log) => sum + Math.max(log.amount, 0), 0);

  const duplicateCount = useMemo(() => {
    const names = orders.map((order) => order.item.trim()).filter(Boolean);
    return names.filter((name, index) => names.indexOf(name) !== index).length;
  }, [orders]);

  const brainScore = useMemo(() => {
    const memoScore =
      memos.reduce((sum, memo) => sum + memo.score, 0) /
      Math.max(memos.length, 1);
    const orderPenalty = duplicateCount * 15;
    const consistencyBonus = completedOrders.length >= 2 ? -5 : 8;
    return Math.max(
      8,
      Math.min(100, Math.round(18 + memoScore + orderPenalty + consistencyBonus)),
    );
  }, [completedOrders.length, duplicateCount, memos]);

  const testScore = useMemo(() => {
    const productHits = memoryProducts.filter((product) =>
      testAnswers.products.includes(product),
    ).length;
    const orderHit = testAnswers.order.replace(/\s/g, "").includes("도시락");
    const reverseHit =
      testAnswers.reverse.replace(/\s/g, "") ===
      reverseNumber.split("").reverse().join("");
    return productHits * 15 + (orderHit ? 20 : 0) + (reverseHit ? 20 : 0);
  }, [testAnswers]);

  const addPointLog = (label: string, amount: number, type: PointLog["type"]) => {
    setPointLogs((logs) => [
      { id: Date.now(), label, amount, type },
      ...logs,
    ]);
  };

  const handleAddOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderItem.trim()) return;
    const newOrder: Order = {
      id: Date.now(),
      item: orderItem.trim(),
      quantity: orderQuantity.trim() || "1개",
      vendor: orderVendor.trim() || "거래처 미지정",
      category: industryTemplates[industry].label,
      status: "pending",
      rewarded: false,
      createdAt: "방금",
    };
    setOrders((current) => [newOrder, ...current]);
    setOrderItem("");
    setOrderQuantity("");
    setOrderVendor("");
  };

  const applyTemplate = () => {
    const template = industryTemplates[industry];
    const nextOrders = template.items.map(([item, quantity, vendor], index) => ({
      id: Date.now() + index,
      item,
      quantity,
      vendor,
      category: template.label,
      status: "pending" as OrderStatus,
      rewarded: false,
      createdAt: "방금",
    }));
    setOrders((current) => [...nextOrders, ...current]);
  };

  const toggleOrder = (id: number) => {
    const target = orders.find((order) => order.id === id);
    if (target?.status !== "done" && target?.rewarded === false) {
      addPointLog(`${target.item} 발주 완료`, 2, "order");
    }
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== id) return order;
        const nextStatus = order.status === "done" ? "pending" : "done";
        return {
          ...order,
          status: nextStatus,
          rewarded: order.rewarded || nextStatus === "done",
        };
      }),
    );
  };

  const deleteOrder = (id: number) => {
    setOrders((current) => current.filter((order) => order.id !== id));
  };

  const handleAddMemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memoText.trim()) return;
    const score = analyzeText(memoText);
    const nextMemo: Memo = {
      id: Date.now(),
      body: memoText.trim(),
      tags: inferTags(memoText),
      score,
      createdAt: "방금",
    };
    setMemos((current) => [nextMemo, ...current]);
    addPointLog("업무 메모 작성", 1, "memo");
    setMemoText("");
  };

  const exchangePoints = (provider: string) => {
    if (points < 1000) return;
    addPointLog(`${provider} 전환 신청`, -1000, "exchange");
  };

  const submitTest = () => {
    setTestSubmitted(true);
    if (testScore >= 60) addPointLog("인지 미니 테스트 완료", 5, "bonus");
  };

  const tabs = [
    ["home", "홈"],
    ["orders", "발주"],
    ["memos", "메모"],
    ["points", "포인트"],
    ["report", "리포트"],
    ["test", "2단계 테스트"],
    ["watch", "워치"],
  ];

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#1d211f]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[#d8d0c2] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#256f5a] text-lg font-black text-white">
              DF
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#6b6258]">
                DailyFit demo
              </p>
              <h1 className="text-2xl font-bold tracking-tight">데일리핏</h1>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Metric label="오늘 적립" value={`${todayPoints}P`} />
            <Metric label="포인트 잔액" value={`${points}P`} />
            <Metric label="두뇌 활동" value={getScoreLabel(brainScore)} />
          </div>
        </header>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={`h-10 shrink-0 rounded-lg border px-4 text-sm font-semibold transition ${
                activeTab === key
                  ? "border-[#1f5f4d] bg-[#1f5f4d] text-white"
                  : "border-[#d8d0c2] bg-white text-[#4d463e] hover:border-[#8d8173]"
              }`}
              onClick={() => setActiveTab(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <section className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold">온보딩 고지</h2>
                <span className="rounded-md bg-[#f0e7d6] px-2 py-1 text-xs font-bold text-[#6c4f21]">
                  Step {onboardingStep}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <button
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    onboardingStep === 1
                      ? "border-[#256f5a] bg-[#edf7f3]"
                      : "border-[#ded6c9] bg-white"
                  }`}
                  onClick={() => setOnboardingStep(1)}
                  type="button"
                >
                  <strong>가입</strong>
                  <span className="mt-1 block text-[#5f665f]">
                    발주와 업무 메모, 포인트 적립을 시작합니다.
                  </span>
                </button>
                <button
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    onboardingStep === 2
                      ? "border-[#256f5a] bg-[#edf7f3]"
                      : "border-[#ded6c9] bg-white"
                  }`}
                  onClick={() => setOnboardingStep(2)}
                  type="button"
                >
                  <strong>3일 뒤 안내</strong>
                  <span className="mt-1 block text-[#5f665f]">
                    업무 기록 기반 두뇌 활동 관찰 동의를 받습니다.
                  </span>
                </button>
                <button
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    onboardingStep === 3
                      ? "border-[#256f5a] bg-[#edf7f3]"
                      : "border-[#ded6c9] bg-white"
                  }`}
                  onClick={() => setOnboardingStep(3)}
                  type="button"
                >
                  <strong>2주 뒤 고지</strong>
                  <span className="mt-1 block text-[#5f665f]">
                    전문 상담 연계 가능성을 명확히 안내합니다.
                  </span>
                </button>
              </div>
              <label className="mt-4 flex items-start gap-2 rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-3 text-sm">
                <input
                  checked={patternConsent}
                  className="mt-1 h-4 w-4 accent-[#256f5a]"
                  onChange={(event) => setPatternConsent(event.target.checked)}
                  type="checkbox"
                />
                <span>두뇌 활동 패턴 관찰 동의</span>
              </label>
            </section>

            <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
              <h2 className="text-base font-bold">업종 템플릿</h2>
              <select
                className="mt-3 h-10 w-full rounded-lg border border-[#cfc7bb] bg-white px-3 text-sm"
                onChange={(event) =>
                  setIndustry(event.target.value as keyof typeof industryTemplates)
                }
                value={industry}
              >
                {Object.entries(industryTemplates).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.label}
                  </option>
                ))}
              </select>
              <button
                className="mt-3 h-10 w-full rounded-lg bg-[#2c6b7f] text-sm font-bold text-white"
                onClick={applyTemplate}
                type="button"
              >
                템플릿 불러오기
              </button>
            </section>
          </aside>

          <div className="min-w-0">
            {activeTab === "home" && (
              <HomePanel
                brainScore={brainScore}
                completedOrders={completedOrders.length}
                duplicateCount={duplicateCount}
                memoText={memoText}
                onMemoChange={setMemoText}
                onMemoSubmit={handleAddMemo}
                orders={orders}
                patternConsent={patternConsent}
                points={points}
                toggleOrder={toggleOrder}
              />
            )}

            {activeTab === "orders" && (
              <OrdersPanel
                deleteOrder={deleteOrder}
                handleAddOrder={handleAddOrder}
                orderItem={orderItem}
                orderQuantity={orderQuantity}
                orderVendor={orderVendor}
                orders={orders}
                setOrderItem={setOrderItem}
                setOrderQuantity={setOrderQuantity}
                setOrderVendor={setOrderVendor}
                toggleOrder={toggleOrder}
              />
            )}

            {activeTab === "memos" && (
              <MemosPanel
                memoText={memoText}
                memos={memos}
                onMemoChange={setMemoText}
                onMemoSubmit={handleAddMemo}
              />
            )}

            {activeTab === "points" && (
              <PointsPanel
                exchangePoints={exchangePoints}
                pointLogs={pointLogs}
                points={points}
              />
            )}

            {activeTab === "report" && (
              <ReportPanel
                brainScore={brainScore}
                duplicateCount={duplicateCount}
                memos={memos}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "test" && (
              <TestPanel
                setTestAnswers={setTestAnswers}
                submitTest={submitTest}
                testAnswers={testAnswers}
                testScore={testScore}
                testSubmitted={testSubmitted}
              />
            )}

            {activeTab === "watch" && (
              <WatchPanel setWatch={setWatch} watch={watch} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d8d0c2] bg-white px-3 py-2">
      <p className="text-xs text-[#6b6258]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function HomePanel({
  brainScore,
  completedOrders,
  duplicateCount,
  memoText,
  onMemoChange,
  onMemoSubmit,
  orders,
  patternConsent,
  points,
  toggleOrder,
}: {
  brainScore: number;
  completedOrders: number;
  duplicateCount: number;
  memoText: string;
  onMemoChange: (value: string) => void;
  onMemoSubmit: (event: FormEvent<HTMLFormElement>) => void;
  orders: Order[];
  patternConsent: boolean;
  points: number;
  toggleOrder: (id: number) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">오늘의 발주 목록</h2>
            <p className="text-sm text-[#60665f]">
              완료 처리하면 건당 2포인트가 적립됩니다.
            </p>
          </div>
          <span className="rounded-md bg-[#edf7f3] px-3 py-2 text-sm font-bold text-[#256f5a]">
            완료 {completedOrders}/{orders.length}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {orders.slice(0, 5).map((order) => (
            <button
              className="grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-3 text-left transition hover:border-[#8d8173]"
              key={order.id}
              onClick={() => toggleOrder(order.id)}
              type="button"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold ${
                  order.status === "done"
                    ? "border-[#256f5a] bg-[#256f5a] text-white"
                    : "border-[#a99d90] bg-white text-transparent"
                }`}
              >
                V
              </span>
              <span>
                <span className="block font-semibold">{order.item}</span>
                <span className="block text-sm text-[#646b64]">
                  {order.quantity} · {order.vendor}
                </span>
              </span>
              <span className="text-xs font-semibold text-[#6b6258]">
                {order.createdAt}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <div className={`rounded-lg border p-4 ${getScoreTone(brainScore)}`}>
          <p className="text-sm font-semibold">두뇌 활동 지수</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-4xl font-black">{brainScore}</p>
            <p className="text-right text-sm font-bold">
              {patternConsent ? getScoreLabel(brainScore) : "동의 대기"}
            </p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-current"
              style={{ width: `${brainScore}%` }}
            />
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Metric label="중복 발주 감지" value={`${duplicateCount}건`} />
          <Metric label="누적 포인트" value={`${points}P`} />
        </dl>
        <form className="mt-4 space-y-3" onSubmit={onMemoSubmit}>
          <label className="text-sm font-bold" htmlFor="quickMemo">
            업무 메모 빠른 입력
          </label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-[#cfc7bb] bg-white p-3 text-sm outline-none focus:border-[#256f5a]"
            id="quickMemo"
            onChange={(event) => onMemoChange(event.target.value)}
            placeholder="예: 저거 행사대 상품 오후에 재고 확인"
            value={memoText}
          />
          <button
            className="h-10 w-full rounded-lg bg-[#1f5f4d] text-sm font-bold text-white"
            type="submit"
          >
            메모 저장
          </button>
        </form>
      </section>
    </div>
  );
}

function OrdersPanel({
  deleteOrder,
  handleAddOrder,
  orderItem,
  orderQuantity,
  orderVendor,
  orders,
  setOrderItem,
  setOrderQuantity,
  setOrderVendor,
  toggleOrder,
}: {
  deleteOrder: (id: number) => void;
  handleAddOrder: (event: FormEvent<HTMLFormElement>) => void;
  orderItem: string;
  orderQuantity: string;
  orderVendor: string;
  orders: Order[];
  setOrderItem: (value: string) => void;
  setOrderQuantity: (value: string) => void;
  setOrderVendor: (value: string) => void;
  toggleOrder: (id: number) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <h2 className="text-xl font-bold">발주 품목 추가</h2>
        <form className="mt-4 space-y-3" onSubmit={handleAddOrder}>
          <TextInput
            label="품목명"
            onChange={setOrderItem}
            placeholder="예: 생수 500ml"
            value={orderItem}
          />
          <TextInput
            label="수량"
            onChange={setOrderQuantity}
            placeholder="예: 2박스"
            value={orderQuantity}
          />
          <TextInput
            label="거래처"
            onChange={setOrderVendor}
            placeholder="예: 해맑은물류"
            value={orderVendor}
          />
          <button
            className="h-10 w-full rounded-lg bg-[#1f5f4d] text-sm font-bold text-white"
            type="submit"
          >
            발주 등록
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">발주 이력</h2>
          <span className="text-sm font-bold text-[#6b6258]">
            {orders.length}건
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-[#ded6c9]">
          {orders.map((order) => (
            <div
              className="grid gap-3 border-b border-[#eee6da] bg-white p-3 last:border-0 sm:grid-cols-[1fr_120px_110px]"
              key={order.id}
            >
              <div>
                <p className="font-bold">{order.item}</p>
                <p className="text-sm text-[#646b64]">
                  {order.quantity} · {order.vendor} · {order.category}
                </p>
              </div>
              <button
                className={`h-10 rounded-lg border text-sm font-bold ${
                  order.status === "done"
                    ? "border-[#256f5a] bg-[#edf7f3] text-[#256f5a]"
                    : "border-[#cfc7bb] bg-[#fbfaf7] text-[#4d463e]"
                }`}
                onClick={() => toggleOrder(order.id)}
                type="button"
              >
                {order.status === "done" ? "완료됨" : "완료 처리"}
              </button>
              <button
                className="h-10 rounded-lg border border-[#cfc7bb] bg-white text-sm font-bold text-[#7f3f35]"
                onClick={() => deleteOrder(order.id)}
                type="button"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MemosPanel({
  memoText,
  memos,
  onMemoChange,
  onMemoSubmit,
}: {
  memoText: string;
  memos: Memo[];
  onMemoChange: (value: string) => void;
  onMemoSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <h2 className="text-xl font-bold">업무 메모</h2>
        <form className="mt-4 space-y-3" onSubmit={onMemoSubmit}>
          <textarea
            className="min-h-40 w-full rounded-lg border border-[#cfc7bb] bg-white p-3 text-sm outline-none focus:border-[#256f5a]"
            onChange={(event) => onMemoChange(event.target.value)}
            placeholder="예: 그 브랜드 있잖아, 오후 발주 전에 이름 확인"
            value={memoText}
          />
          <button
            className="h-10 w-full rounded-lg bg-[#1f5f4d] text-sm font-bold text-white"
            type="submit"
          >
            메모 저장하고 1P 받기
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <h2 className="text-xl font-bold">자동 분류 기록</h2>
        <div className="mt-4 space-y-3">
          {memos.map((memo) => (
            <article
              className="rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-4"
              key={memo.id}
            >
              <p className="text-sm leading-6">{memo.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {memo.tags.map((tag) => (
                  <span
                    className="rounded-md bg-[#edf7f3] px-2 py-1 text-xs font-bold text-[#256f5a]"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
                <span className="ml-auto text-xs font-bold text-[#6b6258]">
                  패턴 +{memo.score}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PointsPanel({
  exchangePoints,
  pointLogs,
  points,
}: {
  exchangePoints: (provider: string) => void;
  pointLogs: PointLog[];
  points: number;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <p className="text-sm font-semibold text-[#6b6258]">포인트 잔액</p>
        <p className="mt-2 text-5xl font-black">{points}P</p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#eee6da]">
          <div
            className="h-full bg-[#2c6b7f]"
            style={{ width: `${Math.min(100, (points / 1000) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-[#60665f]">
          최소 전환 단위 1,000P
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="h-10 rounded-lg border border-[#cfc7bb] bg-white text-sm font-bold disabled:opacity-40"
            disabled={points < 1000}
            onClick={() => exchangePoints("네이버페이")}
            type="button"
          >
            네이버페이
          </button>
          <button
            className="h-10 rounded-lg border border-[#cfc7bb] bg-white text-sm font-bold disabled:opacity-40"
            disabled={points < 1000}
            onClick={() => exchangePoints("카카오페이")}
            type="button"
          >
            카카오페이
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <h2 className="text-xl font-bold">이번 달 적립 내역</h2>
        <div className="mt-4 space-y-2">
          {pointLogs.map((log) => (
            <div
              className="grid grid-cols-[1fr_auto] items-center rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-3"
              key={log.id}
            >
              <span className="text-sm font-semibold">{log.label}</span>
              <span
                className={`font-black ${
                  log.amount < 0 ? "text-[#8f3d31]" : "text-[#256f5a]"
                }`}
              >
                {log.amount > 0 ? "+" : ""}
                {log.amount}P
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              className="flex aspect-square items-center justify-center rounded-md bg-[#edf7f3] text-xs font-black text-[#256f5a]"
              key={index}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportPanel({
  brainScore,
  duplicateCount,
  memos,
  setActiveTab,
}: {
  brainScore: number;
  duplicateCount: number;
  memos: Memo[];
  setActiveTab: (tab: string) => void;
}) {
  const weekly = [22, 24, 26, 21, 28, 31, brainScore];
  return (
    <div className="rounded-lg border border-[#d8d0c2] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">두뇌 활동 리포트</h2>
          <p className="text-sm text-[#60665f]">
            업무 기록 패턴을 긍정적인 웰니스 지표로 표시합니다.
          </p>
        </div>
        <button
          className="h-10 rounded-lg bg-[#2c6b7f] px-4 text-sm font-bold text-white disabled:opacity-45"
          disabled={brainScore < 40}
          onClick={() => setActiveTab("test")}
          type="button"
        >
          2단계 테스트 시작
        </button>
      </div>
      <div className="mt-6 flex h-56 items-end gap-2 border-b border-l border-[#d8d0c2] px-3 pb-3">
        {weekly.map((value, index) => (
          <div className="flex flex-1 flex-col items-center gap-2" key={index}>
            <div
              className={`w-full rounded-t-md ${
                value >= 40 ? "bg-[#b85545]" : "bg-[#2c6b7f]"
              }`}
              style={{ height: `${Math.max(14, value * 2)}px` }}
            />
            <span className="text-xs font-bold text-[#6b6258]">
              {index + 1}일
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Insight label="이번 주 피드백" value="발주 기록이 평소보다 꼼꼼했어요." />
        <Insight label="주의 패턴" value={`중복 발주 ${duplicateCount}건`} />
        <Insight
          label="언어 패턴"
          value={`관찰 메모 ${memos.filter((memo) => memo.score > 0).length}건`}
        />
      </div>
    </div>
  );
}

function TestPanel({
  setTestAnswers,
  submitTest,
  testAnswers,
  testScore,
  testSubmitted,
}: {
  setTestAnswers: (answers: {
    products: string;
    order: string;
    reverse: string;
  }) => void;
  submitTest: () => void;
  testAnswers: { products: string; order: string; reverse: string };
  testScore: number;
  testSubmitted: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <h2 className="text-xl font-bold">2단계 인지 테스트 데모</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {memoryProducts.map((product) => (
            <div
              className="flex aspect-square items-center justify-center rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-3 text-center text-sm font-black"
              key={product}
            >
              {product}
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          <TextInput
            label="사진 속 상품 이름"
            onChange={(value) =>
              setTestAnswers({ ...testAnswers, products: value })
            }
            placeholder="기억나는 상품명을 입력"
            value={testAnswers.products}
          />
          <TextInput
            label="아까 입력한 발주 순서"
            onChange={(value) => setTestAnswers({ ...testAnswers, order: value })}
            placeholder="예: 도시락 김치볶음, 아이스컵..."
            value={testAnswers.order}
          />
          <TextInput
            label={`숫자 ${reverseNumber} 역순`}
            onChange={(value) =>
              setTestAnswers({ ...testAnswers, reverse: value })
            }
            placeholder="거꾸로 입력"
            value={testAnswers.reverse}
          />
          <button
            className="h-10 rounded-lg bg-[#1f5f4d] text-sm font-bold text-white"
            onClick={submitTest}
            type="button"
          >
            결과 확인
          </button>
        </div>
      </section>
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <p className="text-sm font-semibold text-[#6b6258]">테스트 결과</p>
        <p className="mt-2 text-5xl font-black">
          {testSubmitted ? testScore : "--"}
        </p>
        <p className="mt-3 text-sm leading-6 text-[#60665f]">
          {testSubmitted
            ? testScore >= 60
              ? "기억 회상 흐름이 안정적으로 확인되었습니다."
              : "가까운 치매안심센터 상담 연결을 권장합니다."
            : "약 5분짜리 테스트 흐름을 데모로 확인할 수 있습니다."}
        </p>
        <button
          className="mt-4 h-10 w-full rounded-lg border border-[#cfc7bb] bg-[#fbfaf7] text-sm font-bold"
          type="button"
        >
          가까운 치매안심센터 찾기
        </button>
      </section>
    </div>
  );
}

function WatchPanel({
  setWatch,
  watch,
}: {
  setWatch: (watch: { heart: number; sleep: number; activity: number }) => void;
  watch: { heart: number; sleep: number; activity: number };
}) {
  const leisure = watch.heart < 75 && watch.activity < 40;
  const sleepRisk = watch.sleep < 6;
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <h2 className="text-xl font-bold">스마트워치 연동 데모</h2>
        <Slider
          label="심박수"
          max={110}
          min={45}
          onChange={(heart) => setWatch({ ...watch, heart })}
          suffix="bpm"
          value={watch.heart}
        />
        <Slider
          label="수면 시간"
          max={9}
          min={3}
          onChange={(sleep) => setWatch({ ...watch, sleep })}
          suffix="시간"
          value={watch.sleep}
        />
        <Slider
          label="활동량"
          max={100}
          min={0}
          onChange={(activity) => setWatch({ ...watch, activity })}
          suffix="%"
          value={watch.activity}
        />
      </section>
      <section className="rounded-lg border border-[#d8d0c2] bg-white p-4">
        <h2 className="text-xl font-bold">워치 알림</h2>
        <div className="mt-4 space-y-3">
          <Insight
            label="미니 퀴즈"
            value={
              leisure
                ? "여가 시간이 감지되어 1분 퀴즈를 보낼 수 있어요."
                : "활동 중으로 보여 퀴즈 알림을 보류합니다."
            }
          />
          <Insight
            label="수면 피드백"
            value={
              sleepRisk
                ? "수면 부족이 기억력에 영향을 줄 수 있어요."
                : "수면 패턴이 안정 범위에 있습니다."
            }
          />
          <Insight
            label="워치 빠른 메모"
            value="워치 화면에서 발주 메모를 한 줄로 등록하는 흐름입니다."
          />
        </div>
      </section>
    </div>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-lg border border-[#cfc7bb] bg-white px-3 text-sm font-normal outline-none focus:border-[#256f5a]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function Slider({
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="mt-5 block text-sm font-bold">
      <span className="flex items-center justify-between">
        {label}
        <span>
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="mt-3 w-full accent-[#256f5a]"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={label === "수면 시간" ? 0.5 : 1}
        type="range"
        value={value}
      />
    </label>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#ded6c9] bg-[#fbfaf7] p-4">
      <p className="text-xs font-bold uppercase text-[#6b6258]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{value}</p>
    </div>
  );
}
