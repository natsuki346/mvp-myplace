'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{
      fontSize: 17, fontWeight: 800, color: '#3B2F1E',
      margin: '32px 0 12px', lineHeight: 1.5,
    }}>
      {children}
    </h2>
  )
}

function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h3 style={{
      fontSize: 14, fontWeight: 700, color: '#8B6914',
      margin: '20px 0 8px', lineHeight: 1.5,
    }}>
      {children}
    </h3>
  )
}

function P({ children }: { children: ReactNode }) {
  return (
    <p style={{
      fontSize: 14, color: '#3B2F1E', lineHeight: 1.85,
      margin: '0 0 12px',
    }}>
      {children}
    </p>
  )
}

function Ul({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{
      margin: '0 0 12px', paddingLeft: 20,
      fontSize: 14, color: '#3B2F1E', lineHeight: 1.85,
    }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 4 }}>{item}</li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  const router = useRouter()

  return (
    <div
      style={{
        background: '#F5F0E8', maxWidth: 390, margin: '0 auto',
        minHeight: '100svh', padding: '24px 20px 60px',
        overflowY: 'auto',
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: '#8B6914', lineHeight: 1, padding: 0,
          marginBottom: 20,
        }}
      >
        ‹ 戻る
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#3B2F1E', margin: '0 0 8px', lineHeight: 1.4 }}>
        プライバシーポリシー
      </h1>
      <p style={{ fontSize: 12, color: '#A09070', margin: '0 0 20px' }}>
        最終更新日：2026年6月24日
      </p>

      <P>
        DaiMe（以下「本サービス」）は、利用者の皆様に安心してご利用いただけるよう、本プライバシーポリシーに基づき、取得した情報を適切に取り扱います。
      </P>

      <SectionTitle>1. 取得する情報</SectionTitle>
      <P>本サービスは、以下の情報を取得します。</P>

      <SubTitle>(1) アカウント情報</SubTitle>
      <Ul items={['ユーザー名']} />
      <P>
        本サービスのアカウント登録には、メールアドレスや電話番号は使用しません。パスワードは安全な方式でハッシュ化して保存し、運営者を含む第三者が元のパスワードを知ることはできません。
      </P>

      <SubTitle>(2) ご利用の中で入力・作成される情報</SubTitle>
      <Ul items={[
        'オンボーディング時にご自身について記述した内容、およびそこから生成されるタグ',
        'ルーム（チャット）内で送信したメッセージ',
        '日記・メモとして記録した内容',
        '作成したチャンネル名',
        'メッセージへのリアクション（絵文字）',
        '保存（ブックマーク）したメッセージ',
        'プロフィール画像',
        'フレンド間でのつながり（申請・承認の状況）',
      ]} />
      <P>
        これらの情報には、ご自身の感情や考えに関する記述が含まれることがあります。本サービスは、これらの内容を本サービスの提供以外の目的で使用しません。
      </P>

      <SubTitle>(3) ご利用状況に関する情報</SubTitle>
      <Ul items={[
        'ルームやタグを開いた・利用した履歴',
        '各種画面の滞在時間や編集状況',
      ]} />

      <SectionTitle>2. 情報の利用目的</SectionTitle>
      <P>取得した情報は、以下の目的で利用します。</P>
      <Ul items={[
        '本サービスの機能（ガーデン表示、ルーム機能、フレンド機能等）を提供するため',
        'ご自身の入力内容に基づき、AI（Anthropic社のClaude）を用いてタグを生成するため',
        '本サービスの利用状況を把握し、改善を行うため',
      ]} />

      <SectionTitle>3. 第三者への提供・業務委託</SectionTitle>
      <P>
        本サービスは、以下の事業者に対し、サービス提供に必要な範囲で情報を取り扱う業務を委託しています。
      </P>

      <SubTitle>Supabase（データベース・サーバー基盤）</SubTitle>
      <P>
        本サービスのすべてのデータ（ユーザー名、メッセージ、タグ、日記等）は、Supabase社のサーバー上に保存されます。
      </P>

      <SubTitle>Anthropic（AI機能）</SubTitle>
      <P>
        オンボーディング時にご自身について記述した内容は、タグを生成するため、Anthropic社が提供するAI（Claude）に送信されます。送信される情報には、ユーザー名や個人を特定する情報は含まれません。
      </P>

      <SubTitle>Google Fonts（フォント表示）</SubTitle>
      <P>
        本サービスの画面表示には、Google社が提供するWebフォントを使用しています。フォントの読み込み時、ご利用の端末からGoogle社のサーバーへ、IPアドレス等の標準的な通信情報が送信されます。
      </P>

      <P>
        本サービスは、上記以外の第三者（広告事業者、アナリティクス事業者等）への情報提供は行っていません。
      </P>

      <SectionTitle>4. 情報の保管・管理</SectionTitle>
      <P>
        本サービスは、取得した情報を適切に管理し、不正アクセス、漏洞、改ざん等の防止に努めます。パスワードは安全な方式でハッシュ化して保存し、平文（元の文字列）では保存しません。
      </P>

      <SectionTitle>5. 情報の開示・削除</SectionTitle>
      <P>
        利用者の方は、本サービスが保有するご自身の情報について、開示・修正・削除を求めることができます。ご希望の場合は、本ポリシー末尾の連絡先までご連絡ください。
      </P>

      <SectionTitle>6. 未成年の方のご利用について</SectionTitle>
      <P>
        本サービスは、未成年の方もご利用いただけます。未成年の方がご利用される場合、保護者の方の理解のもとでのご利用をお願いいたします。
      </P>

      <SectionTitle>7. プライバシーポリシーの変更</SectionTitle>
      <P>
        本サービスは、必要に応じて本プライバシーポリシーの内容を変更することがあります。変更後のプライバシーポリシーは、本サービス内に掲載した時点から効力を持つものとします。
      </P>

      <SectionTitle>8. お問い合わせ先</SectionTitle>
      <P>
        本プライバシーポリシーに関するお問い合わせは、以下までご連絡ください。
      </P>
      <P>
        DaiMe運営<br />
        メールアドレス：<a href="mailto:natsuki346@icloud.com" style={{ color: '#4A7C59' }}>natsuki346@icloud.com</a>
      </P>
    </div>
  )
}
