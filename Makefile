# cockpit-speedtest — Cockpit 向けインターネット速度テスト拡張
#
# ソースは src/main（本体）と src/test（テスト）に分け、インストール時に
# src/main の中身を /usr/share/cockpit/speedtest へフラットに配置する
# （Cockpit のパッケージ配置形式）。
#
# 使い方:
#   make install        システム全体にインストール (/usr/share/cockpit/speedtest)
#   make devel-install  開発用に現在のユーザーへシンボリックリンクで導入
#   make devel-uninstall
#   make check          構文チェックと単体テスト

APP := speedtest
SRCDIR := src/main
TESTDIR := src/test
FILES := manifest.json index.html index.css index.js speedtest.js

PREFIX ?= /usr
DATADIR ?= $(PREFIX)/share/cockpit
DESTDIR ?=

.PHONY: all install devel-install devel-uninstall check deb

all:
	@echo "make install / make devel-install / make check / make deb のいずれかを指定してください"

install:
	install -d $(DESTDIR)$(DATADIR)/$(APP)
	install -m 0644 $(addprefix $(SRCDIR)/,$(FILES)) $(DESTDIR)$(DATADIR)/$(APP)/

devel-install:
	mkdir -p ~/.local/share/cockpit
	ln -sfn $(CURDIR)/$(SRCDIR) ~/.local/share/cockpit/$(APP)

devel-uninstall:
	rm -f ~/.local/share/cockpit/$(APP)

check:
	node --check $(SRCDIR)/index.js
	node --check $(SRCDIR)/speedtest.js
	node --test $(TESTDIR)/*.js
	python3 -m json.tool $(SRCDIR)/manifest.json > /dev/null
	@echo "check OK"

# Ubuntu 24.04 向け .deb パッケージをビルドする（debhelper が必要）
# 成果物は1つ上のディレクトリに cockpit-speedtest_*_all.deb として作られる
deb:
	dpkg-buildpackage -us -uc -b
