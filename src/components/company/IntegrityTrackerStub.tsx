import Link from "next/link";
import type { CompanyArchive, TrackedPromise } from "@/lib/siwuya-data";

/**
 * v2 阶段不显示实时评分,只列出被追踪的承诺。
 * 严格遵循 spec L370-396 的法律边界:
 *   - 不暴露任何具体诚信分数(避免被解读为投资建议)
 *   - 只呈现"我们在追踪什么",订阅引导留白处理
 */
function PromiseItem({ promise }: { promise: TrackedPromise }) {
  return (
    <li className="promise-item">
      <p className="promise-text">{promise.promise_zh}</p>
      <p className="promise-meta">
        {promise.made_on && <span>承诺于 {promise.made_on}</span>}
        {promise.due_by && <span> · 到期 {promise.due_by}</span>}
        <span> · 类型:{promise.verification_type}</span>
        {promise.source && (
          <>
            {" "}
            ·{" "}
            <a href={promise.source} target="_blank" rel="noopener noreferrer">
              来源
            </a>
          </>
        )}
      </p>
    </li>
  );
}

export function IntegrityTrackerStub({ archive }: { archive: CompanyArchive }) {
  const promises = archive.integrity_tracking.tracked_promises;
  const count = promises.length;

  return (
    <section className="company-section integrity-tracker">
      <h2>📍 诚信追踪</h2>

      {count === 0 ? (
        <p className="integrity-empty">
          尚未登记可追踪的公开承诺。
        </p>
      ) : (
        <p>
          我们正在追踪这家公司的 <strong>{count}</strong> 条管理层承诺。
        </p>
      )}

      {count > 0 && (
        <ul className="promises-list">
          {promises.map((p) => (
            <PromiseItem key={p.id} promise={p} />
          ))}
        </ul>
      )}

      <div className="subscription-cta">
        <p>
          ⚠️ 承诺兑现状态评估与诚信评分将在 Beta 期内逐步开放给订阅用户。
        </p>
        <p>
          <Link href="/beta">订阅 Weekly Brief 解锁完整追踪 →</Link>
        </p>
      </div>
    </section>
  );
}
