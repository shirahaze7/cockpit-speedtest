# cockpit-speedtest — Cockpit 向けインターネット速度テスト拡張 (React + TypeScript)
#
# ビルド成果物は dist/ へ出力され、インストール時に
# dist/ の中身を /usr/share/cockpit/speedtest へ配置する
# （Cockpit のパッケージ配置形式）。
#
# 使い方:
#   make build          TypeScript / React のバンドル (dist/ へ出力)
#   make install        システム全体にインストール (/usr/share/cockpit/speedtest)
#   make devel-install  開発用に現在のユーザーへシンボリックリンクで導入
#   make devel-uninstall
#   make check          型チェックと単体テスト
#   make clean          ビルド生成物の削除

APP := speedtest
BUILDDIR := dist

PREFIX ?= /usr
DATADIR ?= $(PREFIX)/share/cockpit
DESTDIR ?=

.PHONY: all build install devel-install devel-uninstall check clean deb

all: build

build:
	node build.js

install: build
	install -d $(DESTDIR)$(DATADIR)/$(APP)
	cp -r $(BUILDDIR)/* $(DESTDIR)$(DATADIR)/$(APP)/

devel-install: build
	mkdir -p ~/.local/share/cockpit
	ln -sfn $(CURDIR)/$(BUILDDIR) ~/.local/share/cockpit/$(APP)

devel-uninstall:
	rm -f ~/.local/share/cockpit/$(APP)

check: build
	npm run check
	@echo "check OK"

clean:
	rm -rf $(BUILDDIR)

# Ubuntu 24.04 向け .deb パッケージをビルドする（debhelper が必要）
# 成果物は1つ上のディレクトリに cockpit-speedtest_*_all.deb として作られる
deb: build
	dpkg-buildpackage -us -uc -b
